/**
 * [INPUT]: 依赖 CotrialService
 * [OUTPUT]: 共试详情 API
 * [POS]: app/api/cotrials/[id]/route.ts - 共试详情接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCotrialService } from '@/lib/cotrial/cotrial-service';

// ============================================
// 辅助函数
// ============================================

async function getCurrentUser() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('secondme_user');
  if (!userCookie) return null;
  try {
    return JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return null;
  }
}

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

// ============================================
// DELETE /api/cotrials/[id] - 放弃共试任务
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotrialId } = await params;

    // 验证认证
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      }, { status: 401 });
    }

    // 获取共试
    const cotrialService = getCotrialService();
    const cotrial = await cotrialService.getCotrial(cotrialId);

    if (!cotrial) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '共试任务不存在',
        },
      }, { status: 404 });
    }

    // 验证用户是否为参与者
    const match = cotrial.debate?.match;
    const currentUserId = currentUser.userId;
    if (match?.user_a_id !== currentUserId && match?.user_b_id !== currentUserId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '你不是共试任务参与者',
        },
      }, { status: 403 });
    }

    // 不允许删除已完成的共试
    if (cotrial.completed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: '共试任务已完成，无法放弃',
        },
      }, { status: 409 });
    }

    // 删除共试
    await cotrialService.deleteCotrial(cotrialId);

    return NextResponse.json({
      success: true,
      data: { message: '共试任务已放弃' },
    });
  } catch (error: any) {
    console.error('放弃共试任务失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '放弃共试任务失败',
      },
    }, { status: 500 });
  }
}
