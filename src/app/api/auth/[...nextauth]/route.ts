/**
 * NextAuth API 路由（已废弃）
 * [INPUT]: 无
 * [OUTPUT]: 空处理器
 * [POS]: app/api/auth/[...nextauth]/route.ts - 认证 API 入口 (已废弃)
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 此路由已废弃。SecondMe OAuth 流程已迁移到自定义实现：
 * - 登录入口: /api/auth/secondme (GET)
 * - OAuth 回调: /api/auth/secondme (GET)
 */

// 占位处理器，避免编译错误
export function GET() {
  return new Response(JSON.stringify({ error: 'NextAuth 已废弃，请使用 SecondMe OAuth' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function POST() {
  return new Response(JSON.stringify({ error: 'NextAuth 已废弃，请使用 SecondMe OAuth' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
}
