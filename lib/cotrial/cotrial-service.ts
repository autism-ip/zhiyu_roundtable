/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供共试层服务
 * [POS]: lib/cotrial/cotrial-service.ts - 共试层核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { PrismaClient, Cotrial, Debate } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface CotrialServiceConfig {
  minimaxModel?: string;
}

export interface AssignCotrialInput {
  debateId: string;
  taskType?: string;
}

export interface CompleteCotrialInput {
  cotrialId: string;
  result: string;
  userId: string;
}

export interface RateCotrialInput {
  cotrialId: string;
  userId: string;
  satisfaction: number;
  comment?: string;
  wouldContinue?: boolean;
}

/**
 * 扩展的 Cotrial 类型（包含关联数据）
 */
type CotrialWithRelations = Cotrial & {
  debate?: Debate;
};

// ============================================
// 服务类
// ============================================

export class CotrialService {
  private prisma: PrismaClient;
  private minimaxClient: MinimaxClient;
  private config: CotrialServiceConfig;

  constructor(prisma: PrismaClient, config: CotrialServiceConfig = {}) {
    this.prisma = prisma;
    this.config = {
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
  }

  // ============================================
  // 共试管理
  // ============================================

  /**
   * 分配共试任务
   */
  async assignCotrial(input: AssignCotrialInput): Promise<CotrialWithRelations> {
    // 验证争鸣存在
    const debate = await this.prisma.debate.findUnique({
      where: { id: input.debateId },
    });

    if (!debate) {
      throw new Error('争鸣不存在');
    }

    if (debate.status !== 'completed') {
      throw new Error('争鸣未完成，无法分配共试任务');
    }

    if (!debate.shouldConnect) {
      throw new Error('争鸣不建议建立连接');
    }

    // 检查是否已存在共试
    const existingCotrial = await this.prisma.cotrial.findUnique({
      where: { debateId: input.debateId },
    });

    if (existingCotrial) {
      throw new Error('共试任务已存在');
    }

    // 生成任务
    const task = await this.generateTask(debate);

    // 创建共试
    return this.prisma.cotrial.create({
      data: {
        debateId: input.debateId,
        taskType: input.taskType || task.type,
        taskDescription: task.description,
        taskGoal: task.goal,
        taskDuration: task.duration,
        completed: false,
      },
      include: {
        debate: true,
      },
    }) as Promise<CotrialWithRelations>;
  }

  /**
   * 获取共试
   */
  async getCotrial(cotrialId: string): Promise<CotrialWithRelations | null> {
    return this.prisma.cotrial.findUnique({
      where: { id: cotrialId },
      include: {
        debate: {
          include: {
            match: {
              include: {
                userA: true,
                userB: true,
              },
            },
          },
        },
      },
    }) as Promise<CotrialWithRelations | null>;
  }

  /**
   * 按争鸣获取共试
   */
  async getCotrialByDebate(debateId: string): Promise<CotrialWithRelations | null> {
    return this.prisma.cotrial.findUnique({
      where: { debateId },
      include: {
        debate: {
          include: {
            match: {
              include: {
                userA: true,
                userB: true,
              },
            },
          },
        },
      },
    }) as Promise<CotrialWithRelations | null>;
  }

  /**
   * 完成共试任务
   */
  async completeCotrial(input: CompleteCotrialInput): Promise<CotrialWithRelations> {
    const cotrial = await this.getCotrial(input.cotrialId);

    if (!cotrial) {
      throw new Error('共试任务不存在');
    }

    if (cotrial.completed) {
      throw new Error('共试任务已完成');
    }

    // 更新共试
    return this.prisma.cotrial.update({
      where: { id: input.cotrialId },
      data: {
        result: input.result,
        completed: true,
        completedAt: new Date(),
      },
      include: {
        debate: true,
      },
    }) as Promise<CotrialWithRelations>;
  }

  /**
   * 评价共试任务
   */
  async rateCotrial(input: RateCotrialInput): Promise<CotrialWithRelations> {
    const cotrial = await this.getCotrial(input.cotrialId);

    if (!cotrial) {
      throw new Error('共试任务不存在');
    }

    // 判断用户是 A 还是 B
    const match = cotrial.debate?.match;
    const isUserA = match?.userAId === input.userId;

    // 更新反馈
    const feedbackData = {
      satisfaction: input.satisfaction,
      comment: input.comment,
      wouldContinue: input.wouldContinue,
      ratedAt: new Date(),
    };

    if (isUserA) {
      return this.prisma.cotrial.update({
        where: { id: input.cotrialId },
        data: {
          feedbackA: feedbackData as any,
        },
        include: {
          debate: true,
        },
      }) as Promise<CotrialWithRelations>;
    } else {
      return this.prisma.cotrial.update({
        where: { id: input.cotrialId },
        data: {
          feedbackB: feedbackData as any,
        },
        include: {
          debate: true,
        },
      }) as Promise<CotrialWithRelations>;
    }
  }

  /**
   * 标记继续
   */
  async continueCotrial(cotrialId: string, userId: string): Promise<CotrialWithRelations> {
    const cotrial = await this.getCotrial(cotrialId);

    if (!cotrial) {
      throw new Error('共试任务不存在');
    }

    const match = cotrial.debate?.match;
    const isUserA = match?.userAId === userId;

    if (isUserA) {
      return this.prisma.cotrial.update({
        where: { id: cotrialId },
        data: {
          continued: true,
        },
        include: {
          debate: true,
        },
      }) as Promise<CotrialWithRelations>;
    } else {
      // 需要双方都同意才能继续
      if (cotrial.continued === true) {
        return cotrial;
      }
      throw new Error('等待对方确认继续');
    }
  }

  // ============================================
  // AI 方法
  // ============================================

  /**
   * 生成任务
   */
  private async generateTask(debate: Debate): Promise<{
    type: string;
    description: string;
    goal: string;
    duration: string;
  }> {
    const systemPrompt = `你是任务规划专家。根据以下争鸣分析结果，生成一个最小化共试任务。

争鸣分析结果：
- 关系建议: ${debate.relationshipSuggestion}
- 风险领域: ${(debate.riskAreas || []).join(', ')}
- 下一步建议: ${(debate.nextSteps || []).join(', ')}

请生成一个最小化共试任务，格式如下：
{
  "type": "co_collaboration/co_learning/co_creation",
  "description": "任务描述",
  "goal": "任务目标",
  "duration": "7天"
}`;

    try {
      const result = await this.minimaxClient.chatJSON<{
        type: string;
        description: string;
        goal: string;
        duration: string;
      }>(systemPrompt, '请生成任务', { temperature: 0.7, maxTokens: 1000 });

      return result;
    } catch (error) {
      console.error('生成任务失败，使用默认任务:', error);
      return {
        type: 'co_collaboration',
        description: '共同完成一个小型项目',
        goal: '验证合作可行性',
        duration: '7天',
      };
    }
  }
}

// ============================================
// 单例导出
// ============================================

let instance: CotrialService | null = null;

/**
 * 获取 CotrialService 实例
 */
export function getCotrialService(prisma?: PrismaClient): CotrialService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new CotrialService(prisma || defaultPrisma);
  }
  return instance;
}

/**
 * 重置服务实例（用于测试）
 */
export function resetCotrialService(): void {
  instance = null;
}
