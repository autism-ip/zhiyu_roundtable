/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌消息 API
 * [POS]: app/api/rounds/[id]/messages/route.ts - 消息发送与获取
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

const sendMessageSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  content: z.string().min(1, '消息内容不能为空').max(2000),
  type: z.enum(['text', 'quote', 'action']).optional(),
  replyTo: z.string().optional(),
});

const listMessagesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().catch(100),
  before: z.string().optional().catch(undefined),
});

// ============================================
// GET /api/rounds/[id]/messages - 获取消息列表
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params_ = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      before: searchParams.get('before') ? new Date(searchParams.get('before')!) : undefined,
    };

    // 验证参数
    const validated = listMessagesSchema.parse(params_);

    // 获取消息列表
    const roundService = getRoundService();
    const messages = await roundService.getMessages(roundId, {
      limit: validated.limit,
      before: validated.before,
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('获取消息列表失败:', error);

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
        message: '获取消息列表失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/rounds/[id]/messages - 发送消息
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
    const validated = sendMessageSchema.parse(body);

    // 发送消息
    const roundService = getRoundService();
    const message = await roundService.sendMessage({
      roundId,
      userId: validated.userId,
      content: validated.content,
      type: validated.type,
      replyTo: validated.replyTo,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.log({
      action: 'round.message.sent',
      actor: { type: 'user', id: validated.userId },
      resource: { type: 'round', id: roundId },
      context: {
        after: {
          messageId: message.id,
          contentLength: message.content.length,
          type: message.type,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error: any) {
    console.error('发送消息失败:', error);

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

    if (error.message === '圆桌已结束') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ROUND_COMPLETED',
          message: error.message,
        },
      }, { status: 409 });
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

    if (error.message === '用户没有创建 Agent') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_AGENT',
          message: error.message,
        },
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '发送消息失败',
      },
    }, { status: 500 });
  }
}
