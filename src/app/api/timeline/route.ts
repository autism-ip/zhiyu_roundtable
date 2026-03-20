/**
 * [INPUT]: 依赖 TimelineService
 * [OUTPUT]: 提供 GET /api/timeline 接口
 * [POS]: app/api/timeline/route.ts - 时间线 API 路由
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTimelineService } from '@/lib/memory/timeline';

// ============================================
// GET /api/timeline
// ============================================

export async function GET(req: NextRequest) {
  try {
    // 获取当前用户 (使用 cookie-based session)
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('secondme_user');
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '无效的会话' } },
        { status: 401 }
      );
    }

    const userId = currentUser.userId;

    // 解析查询参数
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const options: {
      limit: number;
      offset: number;
      startDate?: Date;
      endDate?: Date;
    } = { limit, offset };

    if (startDateStr) {
      options.startDate = new Date(startDateStr);
    }

    if (endDateStr) {
      options.endDate = new Date(endDateStr);
    }

    // 获取时间线
    const timelineService = getTimelineService();
    const events = await timelineService.getUserTimeline(userId, options);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('获取时间线失败:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '获取时间线失败' } },
      { status: 500 }
    );
  }
}
