/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供圆桌讨论服务
 * [POS]: lib/round/round-service.ts - 圆桌讨论核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { PrismaClient, Round, RoundUser, Message, Topic, Agent } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface RoundServiceConfig {
  minimaxModel?: string;
}

export interface CreateRoundInput {
  topicId: string;
  name: string;
  description?: string;
  hostId: string;
  maxAgents?: number;
}

export interface SendMessageInput {
  roundId: string;
  userId: string;
  content: string;
  type?: 'text' | 'quote' | 'action';
  replyTo?: string;
}

/**
 * 扩展的 Round 类型（包含关联数据）
 */
type RoundWithRelations = Round & {
  topic?: Topic;
  participants?: (RoundUser & { user?: any })[];
  messages?: Message[];
};

/**
 * 扩展的 Message 类型
 */
type MessageWithAgent = Message & {
  agent?: Agent;
};

// ============================================
// 服务类
// ============================================

export class RoundService {
  private prisma: PrismaClient;
  private minimaxClient: MinimaxClient;
  private config: RoundServiceConfig;

  constructor(prisma: PrismaClient, config: RoundServiceConfig = {}) {
    this.prisma = prisma;
    this.config = {
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
  }

  // ============================================
  // 圆桌管理
  // ============================================

  /**
   * 创建圆桌
   */
  async createRound(input: CreateRoundInput): Promise<RoundWithRelations> {
    // 验证话题存在
    const topic = await this.prisma.topic.findUnique({
      where: { id: input.topicId },
    });

    if (!topic) {
      throw new Error('话题不存在');
    }

    // 创建圆桌
    const round = await this.prisma.round.create({
      data: {
        topicId: input.topicId,
        name: input.name,
        description: input.description,
        maxAgents: input.maxAgents || 5,
        status: 'waiting',
      },
      include: {
        topic: true,
        participants: true,
        messages: true,
      },
    });

    // 创建者自动加入
    await this.prisma.roundUser.create({
      data: {
        roundId: round.id,
        userId: input.hostId,
        role: 'host',
      },
    });

    return round as RoundWithRelations;
  }

  /**
   * 获取圆桌信息
   */
  async getRound(roundId: string): Promise<RoundWithRelations | null> {
    return this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        topic: true,
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            agent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }) as Promise<RoundWithRelations>;
  }

  /**
   * 获取圆桌列表
   */
  async listRounds(options?: {
    status?: 'waiting' | 'ongoing' | 'completed';
    topicId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rounds: RoundWithRelations[]; total: number }> {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.topicId) {
      where.topicId = options.topicId;
    }

    const [rounds, total] = await Promise.all([
      this.prisma.round.findMany({
        where,
        include: {
          topic: true,
          participants: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.round.count({ where }),
    ]);

    return { rounds: rounds as RoundWithRelations[], total };
  }

  /**
   * 开始圆桌
   */
  async startRound(roundId: string): Promise<RoundWithRelations> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { participants: true },
    });

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status !== 'waiting') {
      throw new Error('圆桌已开始或已结束');
    }

    return this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'ongoing' },
      include: {
        topic: true,
        participants: { include: { user: true } },
        messages: true,
      },
    }) as Promise<RoundWithRelations>;
  }

  /**
   * 结束圆桌
   */
  async completeRound(roundId: string, summary?: string): Promise<RoundWithRelations> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status !== 'ongoing') {
      throw new Error('圆桌未在进行中');
    }

    return this.prisma.round.update({
      where: { id: roundId },
      data: {
        status: 'completed',
        summary,
      },
      include: {
        topic: true,
        participants: { include: { user: true } },
        messages: true,
      },
    }) as Promise<RoundWithRelations>;
  }

  // ============================================
  // 参与者管理
  // ============================================

  /**
   * 加入圆桌
   */
  async joinRound(roundId: string, userId: string): Promise<RoundUser> {
    // 获取圆桌信息
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { participants: true },
    });

    if (!round) {
      throw new Error('圆桌不存在');
    }

    // 检查状态
    if (round.status !== 'waiting') {
      throw new Error('圆桌已开始或已结束');
    }

    // 检查是否已满
    if (round.participants.length >= round.maxAgents) {
      throw new Error('圆桌已满');
    }

    // 检查是否已加入
    const existingParticipant = round.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      throw new Error('已加入此圆桌');
    }

    // 加入圆桌
    return this.prisma.roundUser.create({
      data: {
        roundId,
        userId,
        role: 'participant',
      },
    });
  }

  /**
   * 离开圆桌
   */
  async leaveRound(roundId: string, userId: string): Promise<void> {
    const participant = await this.prisma.roundUser.findFirst({
      where: { roundId, userId },
    });

    if (!participant) {
      throw new Error('不是圆桌参与者');
    }

    await this.prisma.roundUser.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });
  }

  // ============================================
  // 消息管理
  // ============================================

  /**
   * 发送消息
   */
  async sendMessage(input: SendMessageInput): Promise<MessageWithAgent> {
    // 验证圆桌状态
    const round = await this.prisma.round.findUnique({
      where: { id: input.roundId },
    });

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status === 'completed') {
      throw new Error('圆桌已结束');
    }

    // 验证参与者
    const participants = await this.prisma.roundUser.findMany({
      where: { roundId: input.roundId, leftAt: null },
    });

    const isParticipant = participants.some(p => p.userId === input.userId);
    if (!isParticipant) {
      throw new Error('不是圆桌参与者');
    }

    // 获取用户的 Agent
    const agent = await this.prisma.agent.findUnique({
      where: { userId: input.userId },
    });

    if (!agent) {
      throw new Error('用户没有创建 Agent');
    }

    // 创建消息
    const message = await this.prisma.message.create({
      data: {
        roundId: input.roundId,
        agentId: agent.id,
        content: input.content,
        type: input.type || 'text',
        replyTo: input.replyTo,
      },
      include: {
        agent: true,
      },
    });

    return message as MessageWithAgent;
  }

  /**
   * 获取消息历史
   */
  async getMessages(roundId: string, options?: {
    limit?: number;
    before?: Date;
  }): Promise<MessageWithAgent[]> {
    const where: any = { roundId };

    if (options?.before) {
      where.createdAt = { lt: options.before };
    }

    return this.prisma.message.findMany({
      where,
      include: {
        agent: true,
      },
      orderBy: { createdAt: 'asc' },
      take: options?.limit || 100,
    }) as Promise<MessageWithAgent[]>;
  }

  // ============================================
  // Agent 自动回复
  // ============================================

  /**
   * Agent 生成回复
   */
  async generateAgentReply(roundId: string, agent: Agent): Promise<MessageWithAgent> {
    // 获取圆桌信息
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { topic: true },
    });

    if (!round) {
      throw new Error('圆桌不存在');
    }

    // 获取历史消息
    const messages = await this.prisma.message.findMany({
      where: { roundId },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 构建上下文
    const contextMessages = messages.reverse().map(m =>
      `${m.agent?.name || 'Agent'}: ${m.content}`
    ).join('\n');

    // 构建 Prompt
    const systemPrompt = `你是知遇圆桌的 AI Agent。你的任务是参与圆桌讨论，与其他参与者互动。

圆桌话题：${round.topic?.title || round.name}
你的角色：${agent.name}
性格特点：${agent.personality || '友好、理性'}
专业领域：${(agent.expertise || []).join(', ')}

请根据圆桌讨论的上下文，生成有价值的回复。回复应该：
1. 基于你的专业背景提供独特见解
2. 与其他参与者的观点形成互补或讨论
3. 保持友好、理性的交流风格
4. 控制在 100-300 字之间`;

    const userPrompt = `当前讨论上下文：
${contextMessages || '（暂无消息）'}

请生成你的回复：`;

    try {
      // 调用 Minimax
      const replyContent = await this.minimaxClient.chat(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.7,
          maxTokens: 500,
        }
      );

      // 保存消息
      const message = await this.prisma.message.create({
        data: {
          roundId,
          agentId: agent.id,
          content: replyContent,
          type: 'text',
        },
        include: {
          agent: true,
        },
      });

      // 更新 Agent 最后活跃时间
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { lastActive: new Date() },
      });

      return message as MessageWithAgent;
    } catch (error) {
      console.error('Agent 生成回复失败:', error);
      throw new Error('AI 生成回复失败');
    }
  }

  /**
   * 批量触发 Agent 回复
   */
  async triggerAgentReplies(roundId: string): Promise<MessageWithAgent[]> {
    // 获取进行中的圆桌
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        participants: {
          include: {
            user: {
              include: { agent: true },
            },
          },
        },
      },
    });

    if (!round || round.status !== 'ongoing') {
      throw new Error('圆桌不在进行中');
    }

    // 获取活跃的 Agents
    const agents = round.participants
      .filter(p => p.user?.agent?.isActive)
      .map(p => p.user!.agent);

    // 为每个 Agent 生成回复
    const replies: MessageWithAgent[] = [];

    for (const agent of agents) {
      try {
        const reply = await this.generateAgentReply(roundId, agent);
        replies.push(reply);
      } catch (error) {
        console.error(`Agent ${agent.id} 生成回复失败:`, error);
      }
    }

    return replies;
  }
}

// ============================================
// 单例导出
// ============================================

let instance: RoundService | null = null;

/**
 * 获取 RoundService 实例
 */
export function getRoundService(prisma?: PrismaClient): RoundService {
  if (!instance) {
    // 动态导入 prisma（避免循环依赖）
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new RoundService(prisma || defaultPrisma);
  }
  return instance;
}

/**
 * 重置服务实例（用于测试）
 */
export function resetRoundService(): void {
  instance = null;
}
