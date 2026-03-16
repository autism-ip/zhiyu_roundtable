/**
 * [INPUT]: 依赖 MatchService, AuditLogger
 * [OUTPUT]: 知遇卡列表 API
 * [POS]: app/api/matches/route.ts - 知遇卡 CRUD 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getMatchService } from '@/lib/match/match-service';
import { getAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

// ============================================
// 验证 Schema
// ============================================

const listMatchesSchema = z.object({
  roundId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'declined']).optional().catch(undefined),
});

// ============================================
// GET /api/matches - 获取知遇卡列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params = {
      roundId: searchParams.get('roundId') || undefined,
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
    };

    // 验证参数
    const validated = listMatchesSchema.parse(params);
    const matchService = getMatchService();

    let matches;

    if (validated.roundId) {
      // 按圆桌查询
      matches = await matchService.getMatchesByRound(validated.roundId);
    } else if (validated.userId) {
      // 按用户查询
      matches = await matchService.getMatchesByUser(validated.userId);
    } else {
      // 需要指定 roundId 或 userId
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必须提供 roundId 或 userId',
        },
      }, { status: 400 });
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
