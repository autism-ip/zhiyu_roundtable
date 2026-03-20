/**
 * [INPUT]: 依赖 DebateService, AuditLogger
 * [OUTPUT]: 完成争鸣 API
 * [POS]: app/api/debates/[id]/complete/route.ts - 争鸣完成接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDebateService } from '@/lib/debate/debate-service';
import { getAuditLogger } from '@/lib/audit/logger';

// ============================================
// POST /api/debates/[id]/complete - 完成争鸣
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: debateId } = await params;

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

    // 完成争鸣
    const debateService = getDebateService();
    const debate = await debateService.completeDebate(debateId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    const analysis = debate.analysis as { healthScore?: number } | null;
    await auditLogger.logDebateAction(
      'debate.completed',
      { type: 'user', id: currentUser.userId },
      debateId,
      {
        after: {
          healthScore: analysis?.healthScore,
          shouldConnect: debate.should_connect,
          relationshipSuggestion: debate.relationship_suggestion,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: debate,
    });
  } catch (error: any) {
    console.error('完成争鸣失败:', error);

    if (error.message === '争鸣不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '争鸣不在进行中') {
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
        message: '完成争鸣失败',
      },
    }, { status: 500 });
  }
}
