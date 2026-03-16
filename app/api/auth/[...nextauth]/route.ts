/**
 * NextAuth API 路由
 * [INPUT]: 依赖 lib/auth 的 NextAuth 配置
 * [OUTPUT]: 对外提供 /api/auth/* 认证端点
 * [POS]: app/api/auth/[...nextauth]/route.ts - 认证 API 入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { handlers } from "@/lib/auth";

// 导出 NextAuth 处理函数
export const { GET, POST } = handlers;
