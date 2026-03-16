/**
 * Prisma 客户端
 * [INPUT]: 依赖 DATABASE_URL 环境变量
 * [OUTPUT]: 提供类型安全的数据库访问
 * [POS]: lib/prisma.ts - 数据库访问入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 导出常用类型
export type {
  User,
  Agent,
  Topic,
  Round,
  Match,
  Debate,
  Message,
  Prisma
} from '@prisma/client';
