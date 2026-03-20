/**
 * [INPUT]: 依赖 DebateService, AuditLogger
 * [OUTPUT]: 发起争鸣 API
 * [POS]: app/api/matches/[id]/initiate/route.ts - 争鸣发起接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDebateService } from '@/lib/debate/debate-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const initiateSchema = z.object({
  scenario: z.string().optional(),
});

// ============================================
// POST /api/matches/[id]/initiate - 发起争鸣
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    // 验证认证
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('secondme_user');
    if (!userCookie) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      }, { status: 401 });
    }
    let currentUser;
    let userDbId;
    try {
      const parsedUser = JSON.parse(decodeURIComponent(userCookie.value));
      // 优先使用数据库 UUID
      userDbId = parsedUser.dbId;
      currentUser = {
        userId: userDbId || parsedUser.userId || parsedUser.id,
        secondmeId: parsedUser.userId ? String(parsedUser.userId) : undefined,
        ...parsedUser,
      };
    } catch {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '无效的会话',
        },
      }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = initiateSchema.parse(body);

    // 发起争鸣
    const debateService = getDebateService();
    const debate = await debateService.initiateDebate({
      matchId,
      scenario: validated.scenario,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logDebateAction(
      'debate.initiated',
      { type: 'user', id: currentUser.userId },
      debate.id,
      {
        after: {
          matchId,
          questionCount: (debate.questions as any[])?.length || 0,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: debate,
    }, { status: 201 });
  } catch (error: any) {
    console.error('发起争鸣失败:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败',
          details: error.errors,
        },
      }, { status: 400 });
    }

    if (error.message === '匹配不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '匹配未接受，无法发起争鸣') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: error.message,
        },
      }, { status: 409 });
    }

    if (error.message === '争鸣已存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_EXISTS',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '发起争鸣失败',
      },
    }, { status: 500 });
  }
}
