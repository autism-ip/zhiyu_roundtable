/**
 * [INPUT]: 依赖 CotrialService, AuditLogger
 * [OUTPUT]: 提交共试消息 API
 * [POS]: app/api/cotrials/[id]/messages/route.ts - 共试消息提交接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCotrialService } from '@/lib/cotrial/cotrial-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const messageSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(10000),
});

// ============================================
// POST /api/cotrials/[id]/messages - 提交共试消息
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotrialId } = await params;

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

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = messageSchema.parse(body);

    // 获取共试
    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.getCotrial(cotrialId);

    if (!cotrial) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '共试任务不存在',
        },
      }, { status: 404 });
    }

    if (cotrial.completed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: '共试任务已完成',
        },
      }, { status: 409 });
    }

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logCotrialAction(
      'cotrial.message_submitted',
      { type: 'user', id: currentUser.userId },
      cotrialId,
      {
        after: {
          contentLength: validated.content.length,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        message: '消息提交成功',
        content: validated.content,
      },
    });
  } catch (error: any) {
    console.error('提交共试消息失败:', error);

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

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '提交共试消息失败',
      },
    }, { status: 500 });
  }
}
