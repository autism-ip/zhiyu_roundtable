/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌消息 API
 * [POS]: app/api/rounds/[id]/messages/route.ts - 消息发送与获取
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { defaultRateLimiter, getClientIp } from '@/lib/rate-limit';
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
  before: z.string().datetime().optional().catch(undefined),
});

// ============================================
// GET /api/rounds/[id]/messages - 获取消息列表
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证速率限制
    const ip = getClientIp(request);
    const rateLimitResult = defaultRateLimiter(ip);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }, {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    }

    // 验证认证 (使用 cookie-based session)
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
          code: 'INVALID_SESSION',
          message: '无效的会话',
        },
      }, { status: 401 });
    }

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

    // 验证用户是否是圆桌参与者
    const isParticipant = await roundService.isParticipant(roundId, currentUser.userId);
    if (!isParticipant) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '必须是圆桌参与者才能查看消息',
        },
      }, { status: 403 });
    }

    const messages = await roundService.getMessages(roundId, {
      limit: validated.limit,
      before: validated.before ? new Date(validated.before) : undefined,
    });

    // 格式化返回数据以匹配页面期望的格式
    const formattedMessages = (messages || []).map(m => ({
      id: m.id,
      agent_id: m.agent_id || '',
      agent_name: m.agent?.name || 'AI Agent',
      agent_avatar: m.agent ? (m.agent as any).avatar_url || null : null,
      content: m.content,
      timestamp: m.created_at,
      is_highlighted: false, // 默认不突出显示
    }));

    return NextResponse.json({
      success: true,
      data: formattedMessages,
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
    // 验证速率限制
    const ip = getClientIp(request);
    const rateLimitResult = defaultRateLimiter(ip);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }, {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    }

    const { id: roundId } = await params;

    // 验证认证 (使用 cookie-based session)
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
          code: 'INVALID_SESSION',
          message: '无效的会话',
        },
      }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = sendMessageSchema.parse(body);

    // 验证用户只能操作自己的账号 (防止 IDOR)
    if (validated.userId !== currentUser.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能操作自己的账号',
        },
      }, { status: 403 });
    }

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

    // 格式化返回数据以匹配页面期望的格式
    const formattedMessage = {
      id: message.id,
      agent_id: message.agent_id || '',
      agent_name: message.agent?.name || 'AI Agent',
      agent_avatar: message.agent ? (message.agent as any).avatar_url || null : null,
      content: message.content,
      timestamp: message.created_at,
      is_highlighted: false,
    };

    return NextResponse.json({
      success: true,
      data: formattedMessage,
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
