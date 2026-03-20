/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌详情 API
 * [POS]: app/api/rounds/[id]/route.ts - 圆桌 CRUD 接口
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

const joinRoundSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

// ============================================
// GET /api/rounds/[id] - 获取圆桌详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取圆桌详情
    const roundService = getRoundService();
    const round = await roundService.getRound(id);

    if (!round) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '圆桌不存在',
        },
      }, { status: 404 });
    }

    // 格式化返回数据以匹配页面期望的格式
    // 注意：Supabase返回的participants包含嵌套的user和agent关系，但TypeScript类型不知道
    const participants = (round.participants || []) as any[];
    const hostParticipant = participants.find(p => p.role === 'host');
    const formattedRound = {
      id: round.id,
      name: round.name,
      description: round.description || '',
      topic: round.topic ? {
        title: round.topic.title,
        category: round.topic.category || 'other',
      } : null,
      status: round.status,
      max_agents: round.max_agents || 5,
      participant_count: participants.filter(p => !p.left_at).length,
      message_count: (round.messages || []).length,
      created_at: round.created_at,
      host: hostParticipant?.user ? {
        id: hostParticipant.user.id,
        name: hostParticipant.user.name || '未知',
        avatar: hostParticipant.user.avatar_url || null,
        agent_name: hostParticipant.user.agent?.name || 'AI Agent',
      } : null,
      participants: participants.map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: p.user?.name || '未知参与者',
        avatar: p.user?.avatar_url || null,
        agent_name: p.user?.agent?.name || 'AI Agent',
        agent_expertise: p.user?.agent?.expertise || [],
        role: p.role,
      })),
    };

    return NextResponse.json({
      success: true,
      data: formattedRound,
    });
  } catch (error: any) {
    console.error('获取圆桌详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取圆桌详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/rounds/[id]/join - 加入圆桌
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
          code: 'UNAUTHORIZED',
          message: '无效的会话',
        },
      }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证参数
    const validated = joinRoundSchema.parse(body);

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

    // 加入圆桌
    const roundService = getRoundService();
    const participant = await roundService.joinRound(roundId, validated.userId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.joined',
      { type: 'user', id: validated.userId },
      roundId,
      {
        after: {
          userId: validated.userId,
          role: participant.role,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: participant,
    }, { status: 201 });
  } catch (error: any) {
    console.error('加入圆桌失败:', error);

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

    if (error.message === '圆桌已满') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ROUND_FULL',
          message: error.message,
        },
      }, { status: 409 });
    }

    if (error.message === '已加入此圆桌') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_JOINED',
          message: error.message,
        },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '加入圆桌失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/rounds/[id] - 删除圆桌
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;

    // 验证认证
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('secondme_user');
    if (!userCookie) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录' },
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
        error: { code: 'UNAUTHORIZED', message: '无效的会话' },
      }, { status: 401 });
    }

    // 获取圆桌信息
    const roundService = getRoundService();
    const round = await roundService.getRound(roundId);

    if (!round) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: '圆桌不存在' },
      }, { status: 404 });
    }

    // 验证用户是否是主持人
    const participants = (round.participants || []) as any[];
    const hostParticipant = participants.find(p => p.role === 'host');
    const currentUserId = currentUser.userId;
    if (hostParticipant?.user_id !== currentUserId) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: '只有主持人可以删除圆桌' },
      }, { status: 403 });
    }

    // 删除圆桌（关联的 participants 和 messages 会通过数据库级联删除或手动删除）
    await roundService.deleteRound(roundId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.deleted',
      { type: 'user', id: currentUser.userId },
      roundId,
      {
        before: { roundId, name: round.name, status: round.status },
        after: {},
      }
    );

    return NextResponse.json({
      success: true,
      data: { id: roundId },
    });
  } catch (error: any) {
    console.error('删除圆桌失败:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '删除圆桌失败' },
    }, { status: 500 });
  }
}
