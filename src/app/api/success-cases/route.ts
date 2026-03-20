/**
 * [INPUT]: 依赖 CotrialService, supabaseAdmin
 * [OUTPUT]: 成功案例列表 API
 * [POS]: app/api/success-cases/route.ts - 成功案例接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET /api/success-cases - 获取成功案例
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/client');

    // 获取已完成的共试任务（completed=true）并关联用户信息
    const { data: cotrials, error } = await supabaseAdmin
      .from('cotrials')
      .select(`
        id,
        result,
        task_type,
        task_description,
        completed_at,
        debate:debates(
          id,
          relationship_suggestion,
          match:matches(
            id,
            user_a:users!user_a_id(id, name, avatar_url),
            user_b:users!user_b_id(id, name, avatar_url)
          )
        )
      `)
      .eq('completed', true)
      .not('result', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('获取成功案例失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '获取成功案例失败',
        },
      }, { status: 500 });
    }

    // 格式化返回数据
    const formattedCases = (cotrials || []).map((cotrial: any) => {
      const match = cotrial.debate?.match;
      return {
        id: cotrial.id,
        title: cotrial.task_description || `${cotrial.task_type || '共试'}任务`,
        description: cotrial.result || '任务完成',
        participants: [
          match?.user_a ? { name: match.user_a.name || '匿名用户', avatar: match.user_a.avatar_url } : null,
          match?.user_b ? { name: match.user_b.name || '匿名用户', avatar: match.user_b.avatar_url } : null,
        ].filter(Boolean),
        outcome: cotrial.debate?.relationship_suggestion || '合作',
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedCases,
    });
  } catch (error: any) {
    console.error('获取成功案例失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取成功案例失败',
      },
    }, { status: 500 });
  }
}
