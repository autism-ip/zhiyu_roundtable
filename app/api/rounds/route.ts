/**
 * [INPUT]: 依赖 RoundService, AuditLogger
 * [OUTPUT]: 圆桌列表 API
 * [POS]: app/api/rounds/route.ts - 圆桌 CRUD 接口
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
    };

    // 验证参数
    const validated = listRoundsSchema.parse(params);

    // 获取圆桌列表
    const roundService = getRoundService();
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
    const validated = createRoundSchema.parse(body);

    // 创建圆桌
    const roundService = getRoundService();
    const round = await roundService.createRound({
      ...validated,
      hostId: session.user.id,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logRoundAction(
      'round.created',
      { type: 'user', id: session.user.id },
      round.id,
      {
        after: {
          name: round.name,
          topicId: round.topicId,
          maxAgents: round.maxAgents,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: round,
    }, { status: 201 });
  } catch (error: any) {
    console.error('创建圆桌失败:', error);

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

    if (error.message === '话题不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建圆桌失败',
      },
    }, { status: 500 });
  }
}
