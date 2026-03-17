/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient
 * [OUTPUT]: 对外提供用户服务
 * [POS]: lib/user/user-service.ts - 用户核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { PrismaClient, User } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface UserServiceConfig {}

export interface CreateUserInput {
  email: string;
  name?: string;
  avatar?: string;
  secondmeId?: string;
  interests?: string[];
  connectionTypes?: string[];
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  interests?: string[];
  connectionTypes?: string[];
  allowAgentAutoJoin?: boolean;
}

type UserWithRelations = User & {
  agent?: any;
};

// ============================================
// 服务类
// ============================================

export class UserService {
  private prisma: PrismaClient;
  private config: UserServiceConfig;

  constructor(prisma: PrismaClient, config: UserServiceConfig = {}) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * 创建用户
   */
  async createUser(input: CreateUserInput): Promise<UserWithRelations> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        avatar: input.avatar,
        secondmeId: input.secondmeId,
        interests: input.interests || [],
        connectionTypes: input.connectionTypes || [],
      },
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations>;
  }

  /**
   * 获取用户
   */
  async getUser(userId: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * 通过邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * 通过 SecondMe ID 获取用户
   */
  async getUserBySecondMeId(secondmeId: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { secondmeId },
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<UserWithRelations> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: input,
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations>;
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * 更新用户兴趣
   */
  async updateUserInterests(userId: string, interests: string[]): Promise<UserWithRelations> {
    return this.updateUser(userId, { interests });
  }

  /**
   * 更新用户连接类型偏好
   */
  async updateUserConnectionTypes(userId: string, connectionTypes: string[]): Promise<UserWithRelations> {
    return this.updateUser(userId, { connectionTypes });
  }

  /**
   * 更新 OAuth 令牌
   */
  async updateUserTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
    }
  ): Promise<UserWithRelations> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
      },
      include: {
        agent: true,
      },
    }) as Promise<UserWithRelations>;
  }

  /**
   * 获取用户列表
   */
  async listUsers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ users: UserWithRelations[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          agent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.user.count(),
    ]);

    return { users: users as UserWithRelations[], total };
  }
}

// ============================================
// 单例导出
// ============================================

let instance: UserService | null = null;

export function getUserService(prisma?: PrismaClient): UserService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new UserService(prisma || defaultPrisma);
  }
  return instance;
}

export function resetUserService(): void {
  instance = null;
}
