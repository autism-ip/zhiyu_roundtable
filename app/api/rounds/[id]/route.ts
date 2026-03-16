/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌详情 API
 * [POS]: app/api/rounds/[id]/route.ts - 圆桌 CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRoundService } from '@/lib/round/round-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const joinRoundSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

// ============================================
// GET /api/rounds/[id] - 获取圆桌详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取圆桌详情
    const roundService = getRoundService();
    const round = await roundService.getRound(id);

    if (!round) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '圆桌不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: round,
    });
  } catch (error: any) {
    console.error('获取圆桌详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取圆桌详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/rounds/[id]/join - 加入圆桌
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;

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
    const validated = joinRoundSchema.parse(body);

    // 加入圆桌
    const roundService = getRoundService();
    const participant = await roundService.joinRound(roundId, validated.userId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.joined',
      { type: 'user', id: validated.userId },
      roundId,
      {
        after: {
          userId: validated.userId,
          role: participant.role,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: participant,
    }, { status: 201 });
  } catch (error: any) {
    console.error('加入圆桌失败:', error);

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

    if (error.message === '圆桌不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '圆桌已满') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ROUND_FULL',
          message: error.message,
        },
      }, { status: 409 });
    }

    if (error.message === '已加入此圆桌') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_JOINED',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '加入圆桌失败',
      },
    }, { status: 500 });
  }
}
