/**
 * [INPUT]: 依赖 AgentService
 * [OUTPUT]: Agent 详情 API
 * [POS]: app/api/agents/[userId]/route.ts - Agent 操作接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentService } from '@/lib/agent/agent-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const updateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  personality: z.string().max(2000).optional(),
  expertise: z.array(z.string()).optional(),
  tone: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// GET /api/agents/[userId] - 获取用户的 Agent
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
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

    const { userId } = await params;

    const agentService = getAgentService();
    const agent = await agentService.getAgentByUser(userId);

    if (!agent) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Agent 不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    console.error('获取 Agent 详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取 Agent 详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// PUT /api/agents/[userId] - 更新 Agent
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    // 验证只能修改自己的 Agent
    if (userId !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能修改自己的 Agent',
        },
      }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateAgentSchema.parse(body);

    const agentService = getAgentService();
    const agent = await agentService.getAgentByUser(userId);

    if (!agent) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Agent 不存在',
        },
      }, { status: 404 });
    }

    const updated = await agentService.updateAgent(agent.id, validated);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('更新 Agent 失败:', error);

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
        message: '更新 Agent 失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/agents/[userId] - 删除 Agent
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    // 验证只能删除自己的 Agent
    if (userId !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能删除自己的 Agent',
        },
      }, { status: 403 });
    }

    const agentService = getAgentService();
    const agent = await agentService.getAgentByUser(userId);

    if (!agent) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Agent 不存在',
        },
      }, { status: 404 });
    }

    await agentService.deleteAgent(agent.id);

    return NextResponse.json({
      success: true,
      data: { message: 'Agent 已删除' },
    });
  } catch (error: any) {
    console.error('删除 Agent 失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除 Agent 失败',
      },
    }, { status: 500 });
  }
}
