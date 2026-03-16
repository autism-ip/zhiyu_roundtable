/**
 * [INPUT]: 依赖 CotrialService
 * [OUTPUT]: 共试详情 API
 * [POS]: app/api/cotrials/[id]/route.ts - 共试详情接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCotrialService } from '@/lib/cotrial/cotrial-service';

// ============================================
// GET /api/cotrials/[id] - 获取共试详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.getCotrial(id);

    if (!cotrial) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '共试任务不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: cotrial,
    });
  } catch (error: any) {
    console.error('获取共试详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取共试详情失败',
      },
    }, { status: 500 });
  }
}
