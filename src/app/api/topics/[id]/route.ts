/**
 * [INPUT]: 依赖 TopicService
 * [OUTPUT]: 话题详情 API
 * [POS]: app/api/topics/[id]/route.ts - 话题详情接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTopicService } from '@/lib/topic/topic-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
});

// ============================================
// GET /api/topics/[id] - 获取话题详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const topicService = getTopicService();
    const topic = await topicService.getTopic(id);

    if (!topic) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '话题不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: topic,
    });
  } catch (error: any) {
    console.error('获取话题详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取话题详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// PUT /api/topics/[id] - 更新话题
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const body = await request.json();
    const validated = updateTopicSchema.parse(body);

    const topicService = getTopicService();
    const topic = await topicService.updateTopic(id, validated);

    return NextResponse.json({
      success: true,
      data: topic,
    });
  } catch (error: any) {
    console.error('更新话题失败:', error);

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
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新话题失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/topics/[id] - 删除话题
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const topicService = getTopicService();
    await topicService.deleteTopic(id);

    return NextResponse.json({
      success: true,
      data: { message: '话题已删除' },
    });
  } catch (error: any) {
    console.error('删除话题失败:', error);

    if (error.message === '话题不存在') {
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
        message: '删除话题失败',
      },
    }, { status: 500 });
  }
}
