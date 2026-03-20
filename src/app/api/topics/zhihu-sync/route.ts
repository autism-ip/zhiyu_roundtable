/**
 * 知乎热榜话题同步 API
 * [INPUT]: 依赖 BillboardService, supabaseAdmin
 * [OUTPUT]: 提供 GET /api/topics/zhihu-sync 同步热榜话题到数据库
 * [POS]: app/api/topics/zhihu-sync/route.ts - 知乎话题同步端点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBillboardService } from '@/lib/zhihu/services/billboard'
import { supabaseAdmin } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// ============================================
// 类型定义
// ============================================

interface SyncResult {
  total: number
  created: number
  skipped: number
  errors: string[]
}

// ============================================
// GET /api/topics/zhihu-sync - 同步热榜话题
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('secondme_user')
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      )
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const topCnt = parseInt(searchParams.get('topCnt') || '20')
    const publishInHours = parseInt(searchParams.get('publishInHours') || '48')

    // 获取热榜服务
    const billboardService = createBillboardService()
    if (!billboardService) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_CONFIGURED', message: '知乎API未配置' } },
        { status: 500 }
      )
    }

    // 获取热榜话题
    const topics = await billboardService.getTopicsFromBillboard({ topCnt, publishInHours })

    const result: SyncResult = {
      total: topics.length,
      created: 0,
      skipped: 0,
      errors: [],
    }

    // 逐个创建话题（检查是否已存在）
    for (const topic of topics) {
      try {
        // 检查是否已存在（根据zhihu_id查重）
        const { data: existing } = await supabaseAdmin
          .from('topics')
          .select('id')
          .eq('zhihu_id', topic.zhihu_id)
          .maybeSingle()

        if (existing) {
          result.skipped++
          continue
        }

        // 创建新话题
        const { error } = await supabaseAdmin.from('topics').insert({
          title: topic.title,
          description: topic.description,
          category: topic.category,
          zhihu_id: topic.zhihu_id,
          zhihu_url: topic.zhihu_url,
          status: 'active',
          tags: ['zhihu', '热榜'],
        })

        if (error) {
          throw error
        }

        result.created++
      } catch (err) {
        result.errors.push(`创建话题失败: ${topic.title}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('热榜同步失败:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SYNC_FAILED', message: '同步失败' } },
      { status: 500 }
    )
  }
}
