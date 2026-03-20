/**
 * [INPUT]: 依赖 MatchService, AuditLogger
 * [OUTPUT]: 知遇卡列表 API
 * [POS]: app/api/matches/route.ts - 知遇卡 CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMatchService } from '@/lib/match/match-service';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const listMatchesSchema = z.object({
  roundId: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'declined']).optional().catch(undefined),
});

// ============================================
// GET /api/matches - 获取知遇卡列表
// ============================================

export async function GET(request: NextRequest) {
  try {
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

      // 优先使用数据库 UUID，若不存在则通过 secondme_id 查询
      userDbId = parsedUser.dbId;
      if (!userDbId && parsedUser.id) {
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('secondme_id', String(parsedUser.id))
          .single();
        if (dbUser) {
          userDbId = dbUser.id;
        }
      }

      currentUser = {
        userId: userDbId || parsedUser.id,
        secondmeId: parsedUser.id ? String(parsedUser.id) : undefined,
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

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = {
      roundId: searchParams.get('roundId') || undefined,
      status: searchParams.get('status') || undefined,
    };

    // 验证参数
    const validated = listMatchesSchema.parse(params);
    const matchService = getMatchService();

    let matches;

    if (validated.roundId) {
      // 按圆桌查询
      matches = await matchService.getMatchesByRound(validated.roundId);
    } else {
      // 按当前用户查询
      matches = await matchService.getMatchesByUser(currentUser.userId);
    }

    // 按状态过滤
    if (validated.status) {
      matches = matches.filter(m => m.status === validated.status);
    }

    return NextResponse.json({
      success: true,
      data: matches,
    });
  } catch (error: any) {
    console.error('获取知遇卡列表失败:', error);

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
        message: '获取知遇卡列表失败',
      },
    }, { status: 500 });
  }
}
