/**
 * [INPUT]: 依赖 AgentService
 * [OUTPUT]: Agent 列表 API
 * [POS]: app/api/agents/route.ts - Agent CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAgentService } from '@/lib/agent/agent-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const createAgentSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  name: z.string().min(1, '名称不能为空').max(50),
  personality: z.string().max(2000).optional(),
  expertise: z.array(z.string()).optional(),
  tone: z.string().max(20).optional(),
});

const listAgentsSchema = z.object({
  isActive: z.coerce.boolean().optional().catch(undefined),
  limit: z.coerce.number().min(1).max(50).optional().catch(20),
  offset: z.coerce.number().min(0).optional().catch(0),
});

// ============================================
// GET /api/agents - 获取 Agent 列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const validated = listAgentsSchema.parse(params);
    const agentService = getAgentService();

    const result = await agentService.listAgents({
      isActive: validated.isActive,
      limit: validated.limit,
      offset: validated.offset,
    });

    return NextResponse.json({
      success: true,
      data: result.agents,
      meta: {
        total: result.total,
        limit: validated.limit,
        offset: validated.offset,
      },
    });
  } catch (error: any) {
    console.error('获取 Agent 列表失败:', error);

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
        message: '获取 Agent 列表失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/agents - 创建 Agent
// ============================================

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validated = createAgentSchema.parse(body);

    // 验证只能为自己的用户创建 Agent
    if (validated.userId !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能为自己的用户创建 Agent',
        },
      }, { status: 403 });
    }

    const agentService = getAgentService();
    const agent = await agentService.createAgent(validated);

    return NextResponse.json({
      success: true,
      data: agent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('创建 Agent 失败:', error);

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

    if (error.message === '用户不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '用户已创建 Agent') {
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
        message: '创建 Agent 失败',
      },
    }, { status: 500 });
  }
}
