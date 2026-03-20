/**
 * SecondMe Agent API 代理
 * [INPUT]: 依赖 secondme_user cookie 和 secondme_access_token cookie
 * [OUTPUT]: 提供 SecondMe Agent 相关 API 代理
 * [POS]: app/api/secondme/agent - SecondMe Agent API 代理
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ============================================
// SecondMe API 配置
// ============================================

const SECONDME_API_BASE = 'https://api.mindverse.com/gate/lab';

// ============================================
// 类型定义
// ============================================

interface SecondMeUser {
  userId: string;
  secondmeId?: string;
  dbId?: string;
  id?: string;
  name: string;
  email: string;
  avatar: string;
  profileCompleteness: number;
  route: string;
}

interface SecondMeSession {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface SecondMeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface SecondMeUserInfo {
  userId: number;
  dbId?: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  route: string;
  aboutMe?: string;
  profileCompleteness: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// 辅助函数：从 cookie 获取 token
// ============================================

async function getSecondMeTokens() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('secondme_user');
  const accessTokenCookie = cookieStore.get('secondme_access_token');

  if (!userCookie) {
    return null;
  }

  let user: SecondMeUser;
  try {
    user = JSON.parse(decodeURIComponent(userCookie.value));
    // 优先使用数据库 UUID
    user.userId = user.dbId || user.userId || user.id;
  } catch {
    return null;
  }

  return {
    user,
    accessToken: accessTokenCookie?.value,
  };
}

// ============================================
// 辅助函数：调用 SecondMe API
// ============================================

async function callSecondMeApi<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<{ code: number; data: T; message?: string }> {
  const url = `${SECONDME_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`SecondMe API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// GET /api/secondme/agent
// 获取用户的 SecondMe Agent 信息
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 验证认证
    const tokens = await getSecondMeTokens();
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录 SecondMe',
        },
      }, { status: 401 });
    }

    const { user, accessToken } = tokens;

    // 如果没有 accessToken，返回用户基本信息
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TOKEN_MISSING',
          message: '缺少 SecondMe access token，请重新授权',
        },
      }, { status: 401 });
    }

    // 根据 action 分发请求
    switch (action) {
      case 'sessions':
        return getSessionList(accessToken, searchParams);
      case 'info':
      default:
        return getAgentInfo(accessToken);
    }
  } catch (error: any) {
    console.error('[SecondMe Agent] Agent API 失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'SecondMe Agent API 请求失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// 获取 Agent 信息
// ============================================

async function getAgentInfo(accessToken: string) {
  const result = await callSecondMeApi<SecondMeUserInfo>('/api/secondme/user/info', accessToken);

  if (result.code !== 0) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'SECONDME_ERROR',
        message: result.message || '获取 SecondMe 用户信息失败',
      },
    }, { status: 502 });
  }

  const userInfo = result.data;

  // 构建 Agent 信息
  const agentInfo = {
    // SecondMe 用户 ID
    secondmeId: String(userInfo.userId),
    // 数据库 UUID（如果有）
    dbId: userInfo.dbId,
    // 基本信息
    name: userInfo.name,
    email: userInfo.email,
    avatar: userInfo.avatarUrl,
    route: userInfo.route,
    aboutMe: userInfo.aboutMe,
    // Agent 状态
    profileCompleteness: userInfo.profileCompleteness,
    // Agent 创建和更新时间
    createdAt: new Date(userInfo.createdAt).toISOString(),
    updatedAt: new Date(userInfo.updatedAt).toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: agentInfo,
  });
}

// ============================================
// 获取会话列表
// ============================================

async function getSessionList(accessToken: string, searchParams: URLSearchParams) {
  const pageNo = searchParams.get('pageNo') || '1';
  const pageSize = searchParams.get('pageSize') || '20';

  const result = await callSecondMeApi<{
    sessions: SecondMeSession[];
    total: number;
    pageNo: number;
    pageSize: number;
  }>(
    `/api/secondme/chat/session/list?pageNo=${pageNo}&pageSize=${pageSize}`,
    accessToken
  );

  if (result.code !== 0) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'SECONDME_ERROR',
        message: result.message || '获取会话列表失败',
      },
    }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    data: {
      sessions: result.data.sessions,
      total: result.data.total,
      pageNo: result.data.pageNo,
      pageSize: result.data.pageSize,
    },
  });
}
