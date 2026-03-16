/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 开始圆桌 API
 * [POS]: app/api/rounds/[id]/start/route.ts - 圆桌开始接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRoundService } from '@/lib/round/round-service';
import { getAuditLogger } from '@/lib/audit/logger';

// ============================================
// POST /api/rounds/[id]/start - 开始圆桌
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

    // 开始圆桌
    const roundService = getRoundService();
    const round = await roundService.startRound(roundId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.started',
      { type: 'user', id: session.user.id },
      roundId,
      {
        after: {
          status: 'ongoing',
          participantCount: round.participants?.length || 0,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: round,
    });
  } catch (error: any) {
    console.error('开始圆桌失败:', error);

    if (error.message === '圆桌不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '圆桌已开始或已结束') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '开始圆桌失败',
      },
    }, { status: 500 });
  }
}
