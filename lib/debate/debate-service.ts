/**
 * [INPUT]: 依赖 lib/prisma 的 PrismaClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供争鸣层服务
 * [POS]: lib/debate/debate-service.ts - 争鸣层核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { PrismaClient, Debate, Match } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface DebateServiceConfig {
  minimaxModel?: string;
}

export interface InitiateDebateInput {
  matchId: string;
  scenario?: string;
}

export interface RespondToQuestionInput {
  debateId: string;
  userId: string;
  questionId: string;
  response: string;
}

export interface CompleteDebateInput {
  debateId: string;
}

/**
 * 扩展的 Debate 类型（包含关联数据）
 */
type DebateWithRelations = Debate & {
  match?: Match;
};

// ============================================
// 服务类
// ============================================

export class DebateService {
  private prisma: PrismaClient;
  private minimaxClient: MinimaxClient;
  private config: DebateServiceConfig;

  constructor(prisma: PrismaClient, config: DebateServiceConfig = {}) {
    this.prisma = prisma;
    this.config = {
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
  }

  // ============================================
  // 争鸣管理
  // ============================================

  /**
   * 发起争鸣
   */
  async initiateDebate(input: InitiateDebateInput): Promise<DebateWithRelations> {
    // 验证匹配存在
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
    });

    if (!match) {
      throw new Error('匹配不存在');
    }

    if (match.status !== 'accepted') {
      throw new Error('匹配未接受，无法发起争鸣');
    }

    // 检查是否已存在争鸣
    const existingDebate = await this.prisma.debate.findUnique({
      where: { matchId: input.matchId },
    });

    if (existingDebate) {
      throw new Error('争鸣已存在');
    }

    // 使用 AI 生成问题
    const questions = await this.generateQuestions(match);

    // 创建争鸣
    return this.prisma.debate.create({
      data: {
        matchId: input.matchId,
        scenario: input.scenario || '请回答以下问题以验证合作可行性',
        questions: questions as any,
        responses: [],
        status: 'ongoing',
      },
      include: {
        match: true,
      },
    }) as Promise<DebateWithRelations>;
  }

  /**
   * 获取争鸣
   */
  async getDebate(debateId: string): Promise<DebateWithRelations | null> {
    return this.prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        match: {
          include: {
            userA: true,
            userB: true,
          },
        },
        cotrial: true,
      },
    }) as Promise<DebateWithRelations | null>;
  }

  /**
   * 按匹配获取争鸣
   */
  async getDebateByMatch(matchId: string): Promise<DebateWithRelations | null> {
    return this.prisma.debate.findUnique({
      where: { matchId },
      include: {
        match: {
          include: {
            userA: true,
            userB: true,
          },
        },
        cotrial: true,
      },
    }) as Promise<DebateWithRelations | null>;
  }

  /**
   * 回答问题
   */
  async respondToQuestion(input: RespondToQuestionInput): Promise<DebateWithRelations> {
    const debate = await this.getDebate(input.debateId);

    if (!debate) {
      throw new Error('争鸣不存在');
    }

    if (debate.status !== 'ongoing') {
      throw new Error('争鸣不在进行中');
    }

    // 获取当前回答列表
    const responses = [...(debate.responses as any[])];

    // 添加新回答
    responses.push({
      questionId: input.questionId,
      userId: input.userId,
      response: input.response,
      timestamp: new Date().toISOString(),
    });

    // 更新争鸣
    return this.prisma.debate.update({
      where: { id: input.debateId },
      data: {
        responses: responses as any,
      },
      include: {
        match: true,
      },
    }) as Promise<DebateWithRelations>;
  }

  /**
   * 完成争鸣
   */
  async completeDebate(debateId: string): Promise<DebateWithRelations> {
    const debate = await this.getDebate(debateId);

    if (!debate) {
      throw new Error('争鸣不存在');
    }

    if (debate.status !== 'ongoing') {
      throw new Error('争鸣不在进行中');
    }

    // 使用 AI 分析回答
    const analysis = await this.analyzeResponses(debate);

    // 更新争鸣
    return this.prisma.debate.update({
      where: { id: debateId },
      data: {
        status: 'completed',
        analysis: analysis as any,
        relationshipSuggestion: analysis.relationshipSuggestion,
        shouldConnect: analysis.shouldConnect,
        riskAreas: analysis.riskAreas,
        nextSteps: analysis.nextSteps,
      },
      include: {
        match: true,
      },
    }) as Promise<DebateWithRelations>;
  }

  // ============================================
  // AI 方法
  // ============================================

  /**
   * 生成问题
   */
  private async generateQuestions(match: Match): Promise<string[]> {
    const systemPrompt = `你是一个关系分析专家。根据以下匹配信息，生成3个高风险问题来验证双方的合作可行性。

匹配信息：
- 用户A: ${match.userAId}
- 用户B: ${match.userBId}
- 互补性评分: ${match.complementarityScore}
- 关系类型: ${match.relationshipType}
- 匹配原因: ${match.matchReason}

请生成3个问题，每个问题应该：
1. 揭示双方在合作中可能遇到的真实挑战
2. 测试双方对同一问题的价值观和方法论差异
3. 预测未来合作中可能出现的冲突点

请直接输出问题，不要有其他内容。`;

    try {
      const result = await this.minimaxClient.chatJSON<{ questions: string[] }>(
        systemPrompt,
        '请生成问题',
        { temperature: 0.8, maxTokens: 1000 }
      );
      return result.questions;
    } catch (error) {
      console.error('生成问题失败，使用默认问题:', error);
      return [
        '你们如何处理项目中的分歧？',
        '你们对成功的定义是什么？',
        '如果合作遇到困难，你们会如何解决？',
      ];
    }
  }

  /**
   * 分析回答
   */
  private async analyzeResponses(debate: Debate): Promise<{
    healthScore: number;
    relationshipSuggestion: string;
    shouldConnect: boolean;
    riskAreas: string[];
    nextSteps: string[];
  }> {
    const systemPrompt = `你是关系分析专家。根据以下争鸣回答，分析双方的合作可行性。

争鸣回答：${JSON.stringify(debate.responses)}

请返回以下格式的分析结果：
{
  "healthScore": 0-100的数值,
  "relationshipSuggestion": "cofounder/peer/advisor/none",
  "shouldConnect": true/false,
  "riskAreas": ["风险点1", "风险点2"],
  "nextSteps": ["建议1", "建议2"]
}`;

    try {
      const result = await this.minimaxClient.chatJSON<{
        healthScore: number;
        relationshipSuggestion: string;
        shouldConnect: boolean;
        riskAreas: string[];
        nextSteps: string[];
      }>(systemPrompt, '请分析回答', { temperature: 0.7, maxTokens: 1500 });

      return result;
    } catch (error) {
      console.error('分析回答失败，使用默认结果:', error);
      return {
        healthScore: 60,
        relationshipSuggestion: 'peer',
        shouldConnect: true,
        riskAreas: ['需要更多沟通'],
        nextSteps: ['继续了解对方'],
      };
    }
  }
}

// ============================================
// 单例导出
// ============================================

let instance: DebateService | null = null;

/**
 * 获取 DebateService 实例
 */
export function getDebateService(prisma?: PrismaClient): DebateService {
  if (!instance) {
    const { prisma: defaultPrisma } = require('@/lib/prisma');
    instance = new DebateService(prisma || defaultPrisma);
  }
  return instance;
}

/**
 * 重置服务实例（用于测试）
 */
export function resetDebateService(): void {
  instance = null;
}
