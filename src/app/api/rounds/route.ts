/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌列表 API
 * [POS]: app/api/rounds/route.ts - 圆桌 CRUD 接口
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

const createRoundSchema = z.object({
  topicId: z.string().min(1, '话题ID不能为空'),
  name: z.string().min(1, '圆桌名称不能为空').max(100),
  description: z.string().max(500).optional(),
  maxAgents: z.number().min(2).max(10).optional(),
});

const listRoundsSchema = z.object({
  status: z.enum(['waiting', 'ongoing', 'completed']).optional().catch(undefined),
  topicId: z.string().optional().catch(undefined),
  limit: z.coerce.number().min(1).max(50).optional().catch(20),
  offset: z.coerce.number().min(0).optional().catch(0),
  myCreated: z.enum(['true']).optional().catch(undefined),
  myJoined: z.enum(['true']).optional().catch(undefined),
});

// ============================================
// GET /api/rounds - 获取圆桌列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') || undefined,
      topicId: searchParams.get('topicId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      myCreated: searchParams.get('myCreated') || undefined,
      myJoined: searchParams.get('myJoined') || undefined,
    };

    // 验证参数
    const validated = listRoundsSchema.parse(params);

    // 获取圆桌列表
    const roundService = getRoundService();

    // 如果请求我的圆桌，需要认证
    if (validated.myCreated || validated.myJoined) {
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

      // 获取用户创建的圆桌
      if (validated.myCreated) {
        const result = await roundService.getRoundsByHost(currentUser.userId, {
          status: validated.status,
          limit: validated.limit,
          offset: validated.offset,
        });
        return NextResponse.json({
          success: true,
          data: result.rounds,
          meta: {
            total: result.total,
            limit: validated.limit || 20,
            offset: validated.offset || 0,
          },
        });
      }

      // 获取用户加入的圆桌
      if (validated.myJoined) {
        const result = await roundService.getRoundsByParticipant(currentUser.userId, {
          status: validated.status,
          limit: validated.limit,
          offset: validated.offset,
        });
        return NextResponse.json({
          success: true,
          data: result.rounds,
          meta: {
            total: result.total,
            limit: validated.limit || 20,
            offset: validated.offset || 0,
          },
        });
      }
    }

    // 普通圆桌列表 (无需认证)
    const result = await roundService.listRounds(validated);

    return NextResponse.json({
      success: true,
      data: result.rounds,
      meta: {
        total: result.total,
        limit: validated.limit || 20,
        offset: validated.offset || 0,
      },
    });
  } catch (error: any) {
    console.error('获取圆桌列表失败:', error);

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
        message: '获取圆桌列表失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/rounds - 创建圆桌
// ============================================

export async function POST(request: NextRequest) {
  try {
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
    try {
      currentUser = JSON.parse(decodeURIComponent(userCookie.value));
        // 重要：hostId 必须是数据库 UUID，不能是 SecondMe 数字 ID
        // SecondMe API 返回 userId (数字), 我们在 dbId 存储数据库 UUID
        // cookie 结构: { userId: 2268397, dbId: "uuid-xxx", ... }
        // userId 是 SecondMe 数字 ID，dbId 是数据库 UUID
        // 必须显式使用 dbId，因为 userId 存在时会短路
        const hostId = currentUser.dbId;
        console.log('[API /api/rounds POST] 解析用户cookie成功:', {
          secondmeUserId: currentUser.userId,  // SecondMe 数字 ID
          dbId: hostId,  // 数据库 UUID
        });
        if (!hostId) {
          throw new Error('缺少数据库用户ID (dbId)');
        }
        currentUser.userId = hostId;
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
    console.log('[API /api/rounds POST] 请求体:', body);

    // 验证参数
    const validated = createRoundSchema.parse(body);
    console.log('[API /api/rounds POST] 验证后的数据:', validated);
    console.log('[API /api/rounds POST] 当前用户:', { userId: currentUser.userId });

    // 创建圆桌
    const roundService = getRoundService();
    console.log('[API /api/rounds POST] getRoundService 返回:', !!roundService);
    console.log('[API /api/rounds POST] 开始创建圆桌...');
    const round = await roundService.createRound({
      topicId: validated.topicId,
      name: validated.name,
      description: validated.description,
      maxAgents: validated.maxAgents,
      hostId: currentUser.userId,
    });

    console.log('[API /api/rounds] 创建圆桌成功:', { roundId: round.id, name: round.name });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.created',
      { type: 'user', id: currentUser.userId },
      round.id,
      {
        after: {
          name: round.name,
          topicId: round.topic_id,
          maxAgents: round.max_agents,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: round,
    }, { status: 201 });
  } catch (error: any) {
    console.error('创建圆桌失败:', error);
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);

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
        message: error.message || '创建圆桌失败',
        details: error.stack,
      },
    }, { status: 500 });
  }
}
