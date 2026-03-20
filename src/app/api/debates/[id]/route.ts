/**
 * [INPUT]: 依赖 DebateService
 * [OUTPUT]: 争鸣详情 API
 * [POS]: app/api/debates/[id]/route.ts - 争鸣详情接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebateService } from '@/lib/debate/debate-service';

// ============================================
// GET /api/debates/[id] - 获取争鸣详情
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const debateService = getDebateService();
    const debate = await debateService.getDebate(id);

    if (!debate) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '争鸣不存在',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: debate,
    });
  } catch (error: any) {
    console.error('获取争鸣详情失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取争鸣详情失败',
      },
    }, { status: 500 });
  }
}
