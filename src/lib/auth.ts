/**
 * 认证配置文件（已废弃）
 * [INPUT]: 无
 * [OUTPUT]: 空的 auth 配置
 * [POS]: lib/auth.ts - 认证配置中心 (已废弃，使用 SecondMe 自定义 OAuth)
 * [PROTOCOL]: 此文件已废弃，不再使用
 */

// 注意：此文件已废弃，NextAuth 已迁移到 SecondMe 自定义 OAuth
// 登录逻辑请参考：src/app/api/auth/secondme/route.ts
// Session 验证请使用：src/lib/auth/server-session.ts

// 占位导出，避免其他文件导入时报错
export const authOptions = {};
export const handlers = {};
export const auth = async () => null;
export const signIn = async () => {};
export const signOut = async () => {};
export const getCurrentUser = async () => null;
export const requireAuth = async () => {
  throw new Error("Unauthorized");
};
