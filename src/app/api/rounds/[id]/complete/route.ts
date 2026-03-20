/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 结束圆桌 API
 * [POS]: app/api/rounds/[id]/complete/route.ts - 圆桌结束接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRoundService } from '@/lib/round/round-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const completeRoundSchema = z.object({
  summary: z.string().max(5000).optional(),
});

// ============================================
// POST /api/rounds/[id]/complete - 结束圆桌
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;

    // 验证认证
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('secondme_user');
    if (!userCookie) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } }, { status: 401 });
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
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '无效的会话' } }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = completeRoundSchema.parse(body);

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
      (p) => p.user_id === currentUser.userId && p.role === 'host'
    );
    if (!isHost) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只有主持人才能结束圆桌',
        },
      }, { status: 403 });
    }

    // 结束圆桌
    const completedRound = await roundService.completeRound(roundId, validated.summary);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.completed',
      { type: 'user', id: currentUser.userId },
      roundId,
      {
        after: {
          status: 'completed',
          summary: validated.summary ? '(已提供)' : undefined,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: completedRound,
    });
  } catch (error: any) {
    console.error('结束圆桌失败:', error);

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

    if (error.message === '圆桌未在进行中') {
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
        message: '结束圆桌失败',
      },
    }, { status: 500 });
  }
}
