/**
 * [INPUT]: 依赖 BillboardService, ZhihuBillboardItem
 * [OUTPUT]: 提供热榜预览 API
 * [POS]: app/api/topics/zhihu-preview/route.ts - 热榜预览接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { createBillboardService } from '@/lib/zhihu/services/billboard'
import { ZhihuBillboardItem } from '@/lib/zhihu/types'

export const dynamic = 'force-dynamic'

// ============================================
// GET /api/topics/zhihu-preview - 预览知乎热榜
// ============================================

export async function GET(request: NextRequest) {
  // 检查知乎 API 是否已配置
  const appKey = process.env.ZHIHU_APP_KEY
  const appSecret = process.env.ZHIHU_APP_SECRET

  if (!appKey || !appSecret) {
    return NextResponse.json({
      success: true,
      data: {
        configured: false,
        topics: [],
        message: '知乎API未配置，请设置 ZHIHU_APP_KEY 和 ZHIHU_APP_SECRET',
      },
    })
  }

  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const topCnt = parseInt(searchParams.get('topCnt') || '20')
    const publishInHours = parseInt(searchParams.get('publishInHours') || '48')

    // 获取热榜数据
    const billboardService = createBillboardService()
    const topics = await billboardService.getBillboard({ topCnt, publishInHours })

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        topics: topics as ZhihuBillboardItem[],
      },
    })
  } catch (error) {
    console.error('热榜预览失败:', error)
    return NextResponse.json(
      { success: false, error: { code: 'PREVIEW_FAILED', message: '预览失败' } },
      { status: 500 }
    )
  }
}
