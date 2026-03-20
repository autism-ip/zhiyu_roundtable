/**
 * SecondMe Session Hook
 * [INPUT]: 依赖 secondme_user cookie
 * [OUTPUT]: 提供当前 SecondMe 用户状态
 * [POS]: hooks/use-secondme-session.ts - 读取 SecondMe session
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect } from "react";

export interface SecondMeUser {
  userId: string;  // 数据库 UUID (dbId) 或 SecondMe ID (旧格式)
  secondmeId?: string;  // SecondMe numeric ID
  name: string;
  email: string;
  avatar: string;
  profileCompleteness: number;
  route: string;
}

export interface SecondMeSession {
  user: SecondMeUser | null;
  isLoading: boolean;
}

export function useSecondMeSession(): SecondMeSession {
  const [user, setUser] = useState<SecondMeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 从 cookie 读取 SecondMe 用户信息
    const cookies = document.cookie.split("; ");
    const userCookie = cookies.find((c) => c.startsWith("secondme_user="));

    if (userCookie) {
      try {
        const userData = decodeURIComponent(userCookie.split("=")[1]);
        const parsed = JSON.parse(userData);
        // 映射 dbId 到 userId（兼容新旧 cookie 格式）
        // 新格式: { dbId: "uuid-xxx", id: 2268397, ... }
        // 旧格式: { id: 2268397, ... } (没有 dbId)
        const mappedUser: SecondMeUser = {
          userId: parsed.dbId || parsed.id,  // 优先使用数据库 UUID
          secondmeId: parsed.id ? String(parsed.id) : undefined,
          name: parsed.name || parsed.username || '匿名用户',
          email: parsed.email || '',
          avatar: parsed.avatar_url || parsed.avatar || '',
          profileCompleteness: parsed.profileCompleteness || 0,
          route: parsed.route || '/',
          ...parsed,
        };
        setUser(mappedUser);
      } catch (e) {
        console.error("[SecondMe Session] Failed to parse user cookie:", e);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  return { user, isLoading };
}
