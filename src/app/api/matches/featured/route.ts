/**
 * [INPUT]: 依赖 MatchService
 * [OUTPUT]: 推荐知遇卡列表 API
 * [POS]: app/api/matches/featured/route.ts - 推荐知遇卡接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMatchService } from '@/lib/match/match-service';

// ============================================
// GET /api/matches/featured - 获取推荐知遇卡
// ============================================

export async function GET(request: NextRequest) {
  try {
    const matchService = getMatchService();

    // 获取高质量知遇卡：已accepted且评分较高
    // 由于 MatchService 没有直接方法，我们使用原始查询
    const { supabaseAdmin } = await import('@/lib/supabase/client');

    const { data: matches, error } = await supabaseAdmin
      .from('matches')
      .select(`
        *,
        user_a:users!user_a_id(id, name, avatar_url),
        user_b:users!user_b_id(id, name, avatar_url)
      `)
      .eq('status', 'accepted')
      .not('overall_score', 'is', null)
      .order('overall_score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('获取推荐知遇卡失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '获取推荐知遇卡失败',
        },
      }, { status: 500 });
    }

    // 格式化返回数据
    const formattedMatches = (matches || []).map((match) => ({
      id: match.id,
      user_a: {
        name: match.user_a?.name || '匿名用户',
        avatar: match.user_a?.avatar_url,
      },
      user_b: {
        name: match.user_b?.name || '匿名用户',
        avatar: match.user_b?.avatar_url,
      },
      overall_score: match.overall_score,
      relationship_type: match.relationship_type,
      match_reason: match.match_reason,
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatches,
    });
  } catch (error: any) {
    console.error('获取推荐知遇卡失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取推荐知遇卡失败',
      },
    }, { status: 500 });
  }
}
