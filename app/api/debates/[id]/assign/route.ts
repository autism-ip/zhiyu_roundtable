/**
 * [INPUT]: 依赖 CotrialService, AuditLogger
 * [OUTPUT]: 分配共试任务 API
 * [POS]: app/api/debates/[id]/assign/route.ts - 共试分配接口
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

const assignSchema = z.object({
  taskType: z.string().optional(),
});

// ============================================
// POST /api/debates/[id]/assign - 分配共试任务
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

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = assignSchema.parse(body);

    // 分配共试任务
    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.assignCotrial({
      debateId,
      taskType: validated.taskType,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logCotrialAction(
      'cotrial.assigned',
      { type: 'user', id: session.user.id },
      cotrial.id,
      {
        after: {
          debateId,
          taskType: cotrial.taskType,
          taskDuration: cotrial.taskDuration,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: cotrial,
    }, { status: 201 });
  } catch (error: any) {
    console.error('分配共试任务失败:', error);

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

    if (error.message === '争鸣未完成，无法分配共试任务') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: error.message,
        },
      }, { status: 409 });
    }

    if (error.message === '争鸣不建议建立连接') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: error.message,
        },
      }, { status: 409 });
    }

    if (error.message === '共试任务已存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_EXISTS',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '分配共试任务失败',
      },
    }, { status: 500 });
  }
}
