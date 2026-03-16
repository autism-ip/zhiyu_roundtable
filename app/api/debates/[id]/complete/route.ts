/**
 * [INPUT]: 依赖 DebateService, AuditLogger
 * [OUTPUT]: 完成争鸣 API
 * [POS]: app/api/debates/[id]/complete/route.ts - 争鸣完成接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

    // 完成争鸣
    const debateService = getDebateService();
    const debate = await debateService.completeDebate(debateId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logDebateAction(
      'debate.completed',
      { type: 'user', id: session.user.id },
      debateId,
      {
        after: {
          healthScore: debate.analysis?.healthScore,
          shouldConnect: debate.shouldConnect,
          relationshipSuggestion: debate.relationshipSuggestion,
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
