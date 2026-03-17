/**
 * [INPUT]: 依赖 UserService
 * [OUTPUT]: 用户详情 API
 * [POS]: app/api/users/[id]/route.ts - 用户详情接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserService } from '@/lib/user/user-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const updateUserSchema = z.object({
  name: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  interests: z.array(z.string()).optional(),
  connectionTypes: z.array(z.string()).optional(),
  allowAgentAutoJoin: z.boolean().optional(),
});

// ============================================
// GET /api/users/[id] - 获取用户详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const userService = getUserService();
    const user = await userService.getUser(id);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取用户详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// PUT /api/users/[id] - 更新用户
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 验证只能修改自己的资料
    if (id !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能修改自己的资料',
        },
      }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const userService = getUserService();
    const user = await userService.updateUser(id, validated);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('更新用户失败:', error);

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
        message: '更新用户失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/users/[id] - 删除用户
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 验证只能删除自己的账号
    if (id !== session.user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能删除自己的账号',
        },
      }, { status: 403 });
    }

    const userService = getUserService();
    await userService.deleteUser(id);

    return NextResponse.json({
      success: true,
      data: { message: '用户已删除' },
    });
  } catch (error: any) {
    console.error('删除用户失败:', error);

    if (error.message === '用户不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除用户失败',
      },
    }, { status: 500 });
  }
}
