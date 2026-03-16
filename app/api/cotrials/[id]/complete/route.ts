/**
 * [INPUT]: 依赖 CotrialService, AuditLogger
 * [OUTPUT]: 完成共试任务 API
 * [POS]: app/api/cotrials/[id]/complete/route.ts - 共试完成接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCotrialService } from '@/lib/cotrial/cotrial-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const completeSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  result: z.string().min(1, '结果不能为空').max(5000),
});

// ============================================
// POST /api/cotrials/[id]/complete - 完成共试任务
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotrialId } = await params;

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
    const validated = completeSchema.parse(body);

    // 完成共试任务
    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.completeCotrial({
      cotrialId,
      userId: validated.userId,
      result: validated.result,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logCotrialAction(
      'cotrial.completed',
      { type: 'user', id: validated.userId },
      cotrialId,
      {
        after: {
          result: validated.result.substring(0, 100),
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: cotrial,
    });
  } catch (error: any) {
    console.error('完成共试任务失败:', error);

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

    if (error.message === '共试任务不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '共试任务已完成') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '完成共试任务失败',
      },
    }, { status: 500 });
  }
}
