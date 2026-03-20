/**
 * [INPUT]: 依赖 CotrialService, AuditLogger
 * [OUTPUT]: 评价共试任务 API
 * [POS]: app/api/cotrials/[id]/rate/route.ts - 共试评价接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCotrialService } from '@/lib/cotrial/cotrial-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const rateSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  satisfaction: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  wouldContinue: z.boolean().optional(),
});

// ============================================
// POST /api/cotrials/[id]/rate - 评价共试任务
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotrialId } = await params;

    // 验证认证
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
    const validated = rateSchema.parse(body);

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

    // 评价共试任务
    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.rateCotrial({
      cotrialId,
      userId: validated.userId,
      satisfaction: validated.satisfaction,
      comment: validated.comment,
      wouldContinue: validated.wouldContinue,
    });

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logCotrialAction(
      'cotrial.rated',
      { type: 'user', id: validated.userId },
      cotrialId,
      {
        after: {
          satisfaction: validated.satisfaction,
          wouldContinue: validated.wouldContinue,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: cotrial,
    });
  } catch (error: any) {
    console.error('评价共试任务失败:', error);

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

    if (error.message === '共试任务不存在') {
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
        message: '评价共试任务失败',
      },
    }, { status: 500 });
  }
}
