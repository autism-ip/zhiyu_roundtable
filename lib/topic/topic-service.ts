/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient
 * [OUTPUT]: 对外提供话题服务
 * [POS]: lib/topic/topic-service.ts - 话题核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { PrismaClient, Topic } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface TopicServiceConfig {}

export interface CreateTopicInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  zhihuId?: string;
  zhihuUrl?: string;
}

export interface UpdateTopicInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: string;
}

type TopicWithRelations = Topic & {
  _count?: { rounds: number };
};

// ============================================
// 服务类
// ============================================

export class TopicService {
  private prisma: PrismaClient;
  private config: TopicServiceConfig;

  constructor(prisma: PrismaClient, config: TopicServiceConfig = {}) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * 创建话题
   */
  async createTopic(input: CreateTopicInput): Promise<TopicWithRelations> {
    return this.prisma.topic.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category || 'other',
        tags: input.tags || [],
        zhihuId: input.zhihuId,
        zhihuUrl: input.zhihuUrl,
        status: 'active',
      },
    }) as Promise<TopicWithRelations>;
  }

  /**
   * 获取话题
   */
  async getTopic(topicId: string): Promise<TopicWithRelations | null> {
    return this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        _count: {
          select: { rounds: true },
        },
      },
    }) as Promise<TopicWithRelations | null>;
  }

  /**
   * 获取话题列表
   */
  async listTopics(options?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ topics: TopicWithRelations[]; total: number }> {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.category) {
      where.category = options.category;
    }

    const [topics, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        include: {
          _count: {
            select: { rounds: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { topics: topics as TopicWithRelations[], total };
  }

  /**
   * 更新话题
   */
  async updateTopic(topicId: string, input: UpdateTopicInput): Promise<TopicWithRelations> {
    const topic = await this.getTopic(topicId);
    if (!topic) {
      throw new Error('话题不存在');
    }

    return this.prisma.topic.update({
      where: { id: topicId },
      data: input,
      include: {
        _count: {
          select: { rounds: true },
        },
      },
    }) as Promise<TopicWithRelations>;
  }

  /**
   * 删除话题
   */
  async deleteTopic(topicId: string): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (!topic) {
      throw new Error('话题不存在');
    }

    await this.prisma.topic.delete({
      where: { id: topicId },
    });
  }

  /**
   * 获取热门话题
   */
  async getHotTopics(limit: number = 10): Promise<TopicWithRelations[]> {
    const topics = await this.prisma.topic.findMany({
      where: { status: 'active' },
      include: {
        _count: {
          select: { rounds: true },
        },
      },
      orderBy: {
        rounds: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return topics as TopicWithRelations[];
  }
}

// ============================================
// 单例导出
// ============================================

let instance: TopicService | null = null;

export function getTopicService(prisma?: PrismaClient): TopicService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new TopicService(prisma || defaultPrisma);
  }
  return instance;
}

export function resetTopicService(): void {
  instance = null;
}
