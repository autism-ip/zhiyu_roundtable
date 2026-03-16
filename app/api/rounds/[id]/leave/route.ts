/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 离开圆桌 API
 * [POS]: app/api/rounds/[id]/leave/route.ts - 圆桌离开接口
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

const leaveRoundSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

// ============================================
// POST /api/rounds/[id]/leave - 离开圆桌
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
    const validated = leaveRoundSchema.parse(body);

    // 离开圆桌
    const roundService = getRoundService();
    await roundService.leaveRound(roundId, validated.userId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.left',
      { type: 'user', id: validated.userId },
      roundId,
      {
        after: {
          userId: validated.userId,
          leftAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: { message: '已离开圆桌' },
    });
  } catch (error: any) {
    console.error('离开圆桌失败:', error);

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

    if (error.message === '不是圆桌参与者') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_PARTICIPANT',
          message: error.message,
        },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '离开圆桌失败',
      },
    }, { status: 500 });
  }
}
