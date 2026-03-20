/**
 * [INPUT]: 依赖 MatchService, AuditLogger
 * [OUTPUT]: 知遇卡详情 API
 * [POS]: app/api/matches/[id]/route.ts - 知遇卡操作接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { defaultRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getMatchService } from '@/lib/match/match-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const actionSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
});

// ============================================
// GET /api/matches/[id] - 获取知遇卡详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证速率限制
    const ip = getClientIp(request);
    const rateLimitResult = defaultRateLimiter(ip);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }, {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    }

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

    const { id } = await params;

    const matchService = getMatchService();
    const match = await matchService.getMatch(id);

    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '知遇卡不存在',
        },
      }, { status: 404 });
    }

    // 验证用户是否有权限访问该 match (用户必须是 match 的参与者)
    const currentUserId = currentUser.userId;
    if (match.user_a_id !== currentUserId && match.user_b_id !== currentUserId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权访问此知遇卡',
        },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('获取知遇卡详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取知遇卡详情失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/matches/[id]/accept - 接受知遇卡
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证速率限制 (POST 需要更严格的限制)
    const ip = getClientIp(request);
    const rateLimitResult = defaultRateLimiter(ip);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }, {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    }

    const { id: matchId } = await params;

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
    const validated = actionSchema.parse(body);

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

    // 接受知遇卡
    const matchService = getMatchService();
    const match = await matchService.acceptMatch(matchId, validated.userId);

    // 记录审计日志
    const auditLogger = getAuditLogger();
    await auditLogger.logMatchAction(
      'match.accepted',
      { type: 'user', id: validated.userId },
      matchId,
      {
        before: { status: 'pending' },
        after: { status: 'accepted' },
      }
    );

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('接受知遇卡失败:', error);

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

    if (error.message === '知遇卡不存在') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }, { status: 404 });
    }

    if (error.message === '无权操作此知遇卡') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '接受知遇卡失败',
      },
    }, { status: 500 });
  }
}
