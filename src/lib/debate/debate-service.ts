/**
 * 争鸣服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供争鸣服务
 * [POS]: lib/debate/debate-service.ts - 争鸣核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { DbDebate, DbMatch } from '@/lib/supabase/types';

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

type DebateWithRelations = DbDebate & {
  match?: DbMatch;
};

// ============================================
// 服务类
// ============================================

export class DebateService {
  private minimaxClient: MinimaxClient;
  private config: DebateServiceConfig;

  constructor(config: DebateServiceConfig = {}) {
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
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', input.matchId)
      .single();

    if (!match) {
      throw new Error('匹配不存在');
    }

    if (match.status !== 'accepted') {
      throw new Error('匹配未接受，无法发起争鸣');
    }

    // 检查是否已存在争鸣
    const { data: existingDebate } = await supabaseAdmin
      .from('debates')
      .select('id')
      .eq('match_id', input.matchId)
      .maybeSingle();

    if (existingDebate) {
      throw new Error('争鸣已存在');
    }

    // 使用 AI 生成问题
    const questions = await this.generateQuestions(match);

    // 创建争鸣
    const { data, error } = await supabaseAdmin
      .from('debates')
      .insert({
        match_id: input.matchId,
        scenario: input.scenario || '请回答以下问题以验证合作可行性',
        questions: questions as unknown[],
        responses: [],
        status: 'ongoing',
      })
      .select('*, match:matches(*)')
      .single();

    if (error) throw new Error(`创建争鸣失败: ${error.message}`);
    return data as DebateWithRelations;
  }

  /**
   * 获取争鸣
   */
  async getDebate(debateId: string): Promise<DebateWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, match:matches(*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)), cotrial:cotrials(*)')
      .eq('id', debateId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取争鸣失败: ${error.message}`);
    return data as DebateWithRelations | null;
  }

  /**
   * 按匹配获取争鸣
   */
  async getDebateByMatch(matchId: string): Promise<DebateWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, match:matches(*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)), cotrial:cotrials(*)')
      .eq('match_id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取争鸣失败: ${error.message}`);
    return data as DebateWithRelations | null;
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
    const responses = [...((debate.responses as unknown[]) || [])];

    // 添加新回答
    responses.push({
      questionId: input.questionId,
      userId: input.userId,
      response: input.response,
      timestamp: new Date().toISOString(),
    });

    // 更新争鸣
    const { data, error } = await supabaseAdmin
      .from('debates')
      .update({
        responses: responses as unknown[],
      })
      .eq('id', input.debateId)
      .select('*, match:matches(*)')
      .single();

    if (error) throw new Error(`回答问题失败: ${error.message}`);
    return data as DebateWithRelations;
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
    const { data, error } = await supabaseAdmin
      .from('debates')
      .update({
        status: 'completed',
        analysis: analysis as unknown,
        relationship_suggestion: analysis.relationshipSuggestion,
        should_connect: analysis.shouldConnect,
        risk_areas: analysis.riskAreas,
        next_steps: analysis.nextSteps,
      })
      .eq('id', debateId)
      .select('*, match:matches(*)')
      .single();

    if (error) throw new Error(`完成争鸣失败: ${error.message}`);
    return data as DebateWithRelations;
  }

  // ============================================
  // AI 方法
  // ============================================

  /**
   * 生成问题
   */
  private async generateQuestions(match: DbMatch): Promise<string[]> {
    const systemPrompt = `你是一个关系分析专家。根据以下匹配信息，生成3个高风险问题来验证双方的合作可行性。

匹配信息：
- 用户A: ${match.user_a_id}
- 用户B: ${match.user_b_id}
- 互补性评分: ${match.complementarity_score}
- 关系类型: ${match.relationship_type}
- 匹配原因: ${match.match_reason}

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
  private async analyzeResponses(debate: DbDebate): Promise<{
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

export function getDebateService(): DebateService {
  if (!instance) {
    instance = new DebateService();
  }
  return instance;
}

export function resetDebateService(): void {
  instance = null;
}
