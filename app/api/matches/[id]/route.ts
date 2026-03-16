/**
 * [INPUT]: 依赖 MatchService, AuditLogger
 * [OUTPUT]: 知遇卡详情 API
 * [POS]: app/api/matches/[id]/route.ts - 知遇卡操作接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getMatchService } from '@/lib/match/match-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const actionSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

// ============================================
// GET /api/matches/[id] - 获取知遇卡详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const matchService = getMatchService();
    const match = await matchService.getMatch(id);

    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '知遇卡不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('获取知遇卡详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取知遇卡详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/matches/[id]/accept - 接受知遇卡
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    // 验证认证
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = actionSchema.parse(body);

    // 接受知遇卡
    const matchService = getMatchService();
    const match = await matchService.acceptMatch(matchId, validated.userId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logMatchAction(
      'match.accepted',
      { type: 'user', id: validated.userId },
      matchId,
      {
        before: { status: 'pending' },
        after: { status: 'accepted' },
      }
    );

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('接受知遇卡失败:', error);

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

    if (error.message === '知遇卡不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '无权操作此知遇卡') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '接受知遇卡失败',
      },
    }, { status: 500 });
  }
}
