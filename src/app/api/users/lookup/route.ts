/**
 * [INPUT]: 依赖 UserService
 * [OUTPUT]: 通过 SecondMe ID 查询用户 UUID
 * [POS]: app/api/users/lookup/route.ts - 用户 lookup 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/lib/user/user-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const lookupSchema = z.object({
  secondmeId: z.string().min(1, 'secondmeId 不能为空'),
});

// ============================================
// GET /api/users/lookup - 通过 secondmeId 查询用户 UUID
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const secondmeId = searchParams.get('secondmeId');

    if (!secondmeId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: '缺少 secondmeId 参数',
        },
      }, { status: 400 });
    }

    const validated = lookupSchema.parse({ secondmeId });
    const userService = getUserService();
    const user = await userService.getUserBySecondMeId(validated.secondmeId);

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
      data: {
        id: user.id,
        secondmeId: user.secondme_id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        interests: user.interests,
        connectionTypes: user.connection_types,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('用户 lookup 失败:', error);

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
        message: '查询用户失败',
      },
    }, { status: 500 });
  }
}
