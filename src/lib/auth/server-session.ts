/**
 * Server-side Session Helper
 * [INPUT]: 依赖 next/headers 的 cookies()
 * [OUTPUT]: 提供 getSession() 和 requireSession() 函数
 * [POS]: lib/auth/server-session.ts - Server-side Cookie Session 验证
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface SessionUser {
  userId: string;  // 数据库 UUID (dbId)
  secondmeId: string;  // SecondMe numeric ID
  name: string;
  email: string;
  avatar: string;
  [key: string]: unknown;
}

export interface SessionResult {
  user: SessionUser | null;
  isAuthenticated: boolean;
}

/**
 * 获取当前 session 用户
 * @returns SessionResult
 */
export async function getSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('secondme_user');

  if (!userCookie) {
    return { user: null, isAuthenticated: false };
  }

  try {
    const userData = JSON.parse(decodeURIComponent(userCookie.value));
    // 映射 dbId 到 userId (数据库 UUID)
    const user: SessionUser = {
      userId: userData.dbId || userData.id,
      secondmeId: String(userData.id),
      name: userData.name || userData.username || '匿名用户',
      email: userData.email || '',
      avatar: userData.avatar_url || userData.avatar || '',
      ...userData,
    };
    return { user, isAuthenticated: true };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

/**
 * 要求用户已认证，如果未认证则返回 401
 * @returns SessionUser | NextResponse (with error)
 */
export async function requireSession(): Promise<SessionUser | NextResponse> {
  const { user, isAuthenticated } = await getSession();

  if (!isAuthenticated || !user) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录',
      },
    }, { status: 401 });
  }

  return user;
}
