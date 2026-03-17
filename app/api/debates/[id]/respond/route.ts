/**
 * [INPUT]: 依赖 DebateService, AuditLogger
 * [OUTPUT]: 回答争鸣问题 API
 * [POS]: app/api/debates/[id]/respond/route.ts - 争鸣回答接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDebateService } from '@/lib/debate/debate-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const respondSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  questionId: z.string().min(1, '问题ID不能为空'),
  response: z.string().min(1, '回答不能为空').max(2000),
});

// ============================================
// POST /api/debates/[id]/respond - 回答问题
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: debateId } = await params;

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

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = respondSchema.parse(body);

    // 验证用户只能操作自己的账号 (防止 IDOR)
    if (validated.userId !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能操作自己的账号',
        },
      }, { status: 403 });
    }

    // 回答问题
    const debateService = getDebateService();
    const debate = await debateService.respondToQuestion({
      debateId,
      userId: validated.userId,
      questionId: validated.questionId,
      response: validated.response,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logDebateAction(
      'debate.responded',
      { type: 'user', id: validated.userId },
      debateId,
      {
        after: {
          questionId: validated.questionId,
          responseLength: validated.response.length,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: debate,
    });
  } catch (error: any) {
    console.error('回答问题失败:', error);

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
        message: '回答问题失败',
      },
    }, { status: 500 });
  }
}
