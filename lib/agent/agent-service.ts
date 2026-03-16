/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient
 * [OUTPUT]: 对外提供 Agent 服务
 * [POS]: lib/agent/agent-service.ts - Agent 核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { PrismaClient, Agent, User } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface AgentServiceConfig {}

export interface CreateAgentInput {
  userId: string;
  name: string;
  personality?: string;
  expertise?: string[];
  tone?: string;
}

export interface UpdateAgentInput {
  name?: string;
  personality?: string;
  expertise?: string[];
  tone?: string;
  isActive?: boolean;
}

type AgentWithRelations = Agent & {
  user?: User;
};

// ============================================
// 服务类
// ============================================

export class AgentService {
  private prisma: PrismaClient;
  private config: AgentServiceConfig;

  constructor(prisma: PrismaClient, config: AgentServiceConfig = {}) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * 创建 Agent
   */
  async createAgent(input: CreateAgentInput): Promise<AgentWithRelations> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 检查是否已存在 Agent
    const existingAgent = await this.prisma.agent.findUnique({
      where: { userId: input.userId },
    });

    if (existingAgent) {
      throw new Error('用户已创建 Agent');
    }

    return this.prisma.agent.create({
      data: {
        userId: input.userId,
        name: input.name,
        personality: input.personality,
        expertise: input.expertise || [],
        tone: input.tone || 'friendly',
        isActive: true,
      },
      include: {
        user: true,
      },
    }) as Promise<AgentWithRelations>;
  }

  /**
   * 获取 Agent
   */
  async getAgent(agentId: string): Promise<AgentWithRelations | null> {
    return this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: true,
      },
    }) as Promise<AgentWithRelations | null>;
  }

  /**
   * 按用户 ID 获取 Agent
   */
  async getAgentByUser(userId: string): Promise<AgentWithRelations | null> {
    return this.prisma.agent.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    }) as Promise<AgentWithRelations | null>;
  }

  /**
   * 获取 Agent 列表
   */
  async listAgents(options?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ agents: AgentWithRelations[]; total: number }> {
    const where: any = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.agent.count({ where }),
    ]);

    return { agents: agents as AgentWithRelations[], total };
  }

  /**
   * 更新 Agent
   */
  async updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentWithRelations> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent 不存在');
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: input,
      include: {
        user: true,
      },
    }) as Promise<AgentWithRelations>;
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent 不存在');
    }

    await this.prisma.agent.delete({
      where: { id: agentId },
    });
  }

  /**
   * 更新 Agent 活跃状态
   */
  async setActive(agentId: string, isActive: boolean): Promise<AgentWithRelations> {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { isActive },
      include: {
        user: true,
      },
    }) as Promise<AgentWithRelations>;
  }

  /**
   * 获取活跃的 Agents
   */
  async getActiveAgents(limit: number = 50): Promise<AgentWithRelations[]> {
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true },
      include: {
        user: true,
      },
      orderBy: { lastActive: 'desc' },
      take: limit,
    });

    return agents as AgentWithRelations[];
  }
}

// ============================================
// 单例导出
// ============================================

let instance: AgentService | null = null;

export function getAgentService(prisma?: PrismaClient): AgentService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new AgentService(prisma || defaultPrisma);
  }
  return instance;
}

export function resetAgentService(): void {
  instance = null;
}
