/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient
 * [OUTPUT]: 对外提供知遇卡服务
 * [POS]: lib/match/match-service.ts - 知遇卡核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { PrismaClient, Match, User } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface MatchServiceConfig {}

export interface AcceptMatchInput {
  userId: string;
}

export interface DeclineMatchInput {
  userId: string;
}

/**
 * 扩展的 Match 类型（包含关联数据）
 */
type MatchWithRelations = Match & {
  userA?: User;
  userB?: User;
  round?: any;
  debate?: any;
};

// ============================================
// 服务类
// ============================================

export class MatchService {
  private prisma: PrismaClient;
  private config: MatchServiceConfig;

  constructor(prisma: PrismaClient, config: MatchServiceConfig = {}) {
    this.prisma = prisma;
    this.config = config;
  }

  // ============================================
  // 知遇卡管理
  // ============================================

  /**
   * 创建知遇卡
   */
  async createMatch(data: {
    roundId: string;
    userAId: string;
    userBId: string;
    complementarityScore: number;
    futureGenerativityScore: number;
    overallScore: number;
    relationshipType: string;
    matchReason: string;
    complementarityAreas: string[];
    insights?: any;
  }): Promise<MatchWithRelations> {
    return this.prisma.match.create({
      data: {
        roundId: data.roundId,
        userAId: data.userAId,
        userBId: data.userBId,
        complementarityScore: data.complementarityScore,
        futureGenerativityScore: data.futureGenerativityScore,
        overallScore: data.overallScore,
        relationshipType: data.relationshipType,
        matchReason: data.matchReason,
        complementarityAreas: data.complementarityAreas,
        insights: data.insights || {},
        status: 'pending',
      },
      include: {
        userA: true,
        userB: true,
        round: true,
      },
    }) as Promise<MatchWithRelations>;
  }

  /**
   * 获取知遇卡
   */
  async getMatch(matchId: string): Promise<MatchWithRelations | null> {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: true,
        userB: true,
        round: true,
        debate: true,
      },
    }) as Promise<MatchWithRelations | null>;
  }

  /**
   * 获取圆桌的知遇卡列表
   */
  async getMatchesByRound(roundId: string): Promise<MatchWithRelations[]> {
    return this.prisma.match.findMany({
      where: { roundId },
      include: {
        userA: true,
        userB: true,
      },
      orderBy: { complementarityScore: 'desc' },
    }) as Promise<MatchWithRelations[]>;
  }

  /**
   * 获取用户的知遇卡列表
   */
  async getMatchesByUser(userId: string): Promise<MatchWithRelations[]> {
    return this.prisma.match.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
      },
      include: {
        userA: true,
        userB: true,
        round: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<MatchWithRelations[]>;
  }

  /**
   * 接受知遇卡
   */
  async acceptMatch(matchId: string, userId: string): Promise<MatchWithRelations> {
    const match = await this.getMatch(matchId);

    if (!match) {
      throw new Error('知遇卡不存在');
    }

    // 验证用户是知遇卡的一方
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new Error('无权操作此知遇卡');
    }

    // 更新状态
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'accepted' },
      include: {
        userA: true,
        userB: true,
        round: true,
      },
    }) as Promise<MatchWithRelations>;
  }

  /**
   * 拒绝知遇卡
   */
  async declineMatch(matchId: string, userId: string): Promise<MatchWithRelations> {
    const match = await this.getMatch(matchId);

    if (!match) {
      throw new Error('知遇卡不存在');
    }

    // 验证用户是知遇卡的一方
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new Error('无权操作此知遇卡');
    }

    // 更新状态
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'declined' },
      include: {
        userA: true,
        userB: true,
        round: true,
      },
    }) as Promise<MatchWithRelations>;
  }

  /**
   * 获取待处理的知遇卡
   */
  async getPendingMatches(roundId: string): Promise<MatchWithRelations[]> {
    return this.prisma.match.findMany({
      where: {
        roundId,
        status: 'pending',
      },
      include: {
        userA: true,
        userB: true,
      },
    }) as Promise<MatchWithRelations[]>;
  }
}

// ============================================
// 单例导出
// ============================================

let instance: MatchService | null = null;

/**
 * 获取 MatchService 实例
 */
export function getMatchService(prisma?: PrismaClient): MatchService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new MatchService(prisma || defaultPrisma);
  }
  return instance;
}

/**
 * 重置服务实例（用于测试）
 */
export function resetMatchService(): void {
  instance = null;
}
