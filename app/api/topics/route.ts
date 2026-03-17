/**
 * [INPUT]: 依赖 TopicService
 * [OUTPUT]: 话题列表 API
 * [POS]: app/api/topics/route.ts - 话题 CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTopicService } from '@/lib/topic/topic-service';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const createTopicSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  zhihuId: z.string().optional(),
  zhihuUrl: z.string().url().optional(),
});

const listTopicsSchema = z.object({
  status: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  limit: z.coerce.number().min(1).max(50).optional().catch(20),
  offset: z.coerce.number().min(0).optional().catch(0),
});

// ============================================
// GET /api/topics - 获取话题列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const validated = listTopicsSchema.parse(params);
    const topicService = getTopicService();

    const result = await topicService.listTopics({
      status: validated.status,
      category: validated.category,
      limit: validated.limit,
      offset: validated.offset,
    });

    return NextResponse.json({
      success: true,
      data: result.topics,
      meta: {
        total: result.total,
        limit: validated.limit,
        offset: validated.offset,
      },
    });
  } catch (error: any) {
    console.error('获取话题列表失败:', error);

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
        message: '获取话题列表失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/topics - 创建话题
// ============================================

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validated = createTopicSchema.parse(body);

    const topicService = getTopicService();
    const topic = await topicService.createTopic({
      title: validated.title,
      description: validated.description,
      category: validated.category,
      tags: validated.tags,
      zhihuId: validated.zhihuId,
      zhihuUrl: validated.zhihuUrl,
    });

    return NextResponse.json({
      success: true,
      data: topic,
    }, { status: 201 });
  } catch (error: any) {
    console.error('创建话题失败:', error);

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
        message: '创建话题失败',
      },
    }, { status: 500 });
  }
}
