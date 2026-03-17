/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 开始圆桌 API
 * [POS]: app/api/rounds/[id]/start/route.ts - 圆桌开始接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      }, { status: 401 });
    }

    // 获取圆桌信息验证是否为主持人
    const roundService = getRoundService();
    const round = await roundService.getRound(roundId);
    if (!round) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '圆桌不存在',
        },
      }, { status: 404 });
    }

    // 验证是否为圆桌主持人
    const isHost = round.participants?.some(
      (p) => p.userId === session.user.id && p.role === 'host'
    );
    if (!isHost) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只有主持人才能开始圆桌',
        },
      }, { status: 403 });
    }

    // 开始圆桌
    const startedRound = await roundService.startRound(roundId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.started',
      { type: 'user', id: session.user.id },
      roundId,
      {
        after: {
          status: 'ongoing',
          participantCount: startedRound.participants?.length || 0,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: startedRound,
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
