/**
 * [INPUT]: 依赖 UserService
 * [OUTPUT]: 用户列表 API
 * [POS]: app/api/users/route.ts - 用户 CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserService } from '@/lib/user/user-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const createUserSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  name: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  interests: z.array(z.string()).optional(),
  connectionTypes: z.array(z.string()).optional(),
});

const listUsersSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().catch(20),
  offset: z.coerce.number().min(0).optional().catch(0),
});

// ============================================
// GET /api/users - 获取用户列表
// ============================================

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const params = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const validated = listUsersSchema.parse(params);
    const userService = getUserService();

    const result = await userService.listUsers({
      limit: validated.limit,
      offset: validated.offset,
    });

    return NextResponse.json({
      success: true,
      data: result.users,
      meta: {
        total: result.total,
        limit: validated.limit,
        offset: validated.offset,
      },
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取用户列表失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/users - 创建用户
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const userService = getUserService();
    const user = await userService.createUser({
      email: validated.email,
      name: validated.name,
      avatar: validated.avatar,
      interests: validated.interests,
      connectionTypes: validated.connectionTypes,
    });

    return NextResponse.json({
      success: true,
      data: user,
    }, { status: 201 });
  } catch (error: any) {
    console.error('创建用户失败:', error);

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
        message: '创建用户失败',
      },
    }, { status: 500 });
  }
}
