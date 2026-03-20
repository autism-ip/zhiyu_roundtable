/**
 * 共试服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供共试服务
 * [POS]: lib/cotrial/cotrial-service.ts - 共试核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { DbCotrial, DbDebate, DbMatch } from '@/lib/supabase/types';

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

type CotrialWithRelations = DbCotrial & {
  debate?: DbDebate & {
    match?: DbMatch;
  };
};

// ============================================
// 服务类
// ============================================

export class CotrialService {
  private minimaxClient: MinimaxClient;
  private config: CotrialServiceConfig;

  constructor(config: CotrialServiceConfig = {}) {
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
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', input.debateId)
      .single();

    if (!debate) {
      throw new Error('争鸣不存在');
    }

    if (debate.status !== 'completed') {
      throw new Error('争鸣未完成，无法分配共试任务');
    }

    if (!debate.should_connect) {
      throw new Error('争鸣不建议建立连接');
    }

    // 检查是否已存在共试
    const { data: existingCotrial } = await supabaseAdmin
      .from('cotrials')
      .select('id')
      .eq('debate_id', input.debateId)
      .maybeSingle();

    if (existingCotrial) {
      throw new Error('共试任务已存在');
    }

    // 生成任务
    const task = await this.generateTask(debate);

    // 创建共试
    const { data, error } = await supabaseAdmin
      .from('cotrials')
      .insert({
        debate_id: input.debateId,
        task_type: input.taskType || task.type,
        task_description: task.description,
        task_goal: task.goal,
        task_duration: task.duration,
        completed: false,
      })
      .select('*, debate:debates(*)')
      .single();

    if (error) throw new Error(`分配共试任务失败: ${error.message}`);
    return data as CotrialWithRelations;
  }

  /**
   * 获取共试
   */
  async getCotrial(cotrialId: string): Promise<CotrialWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('cotrials')
      .select('*, debate:debates(*, match:matches(*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)))')
      .eq('id', cotrialId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取共试失败: ${error.message}`);
    return data as CotrialWithRelations | null;
  }

  /**
   * 按争鸣获取共试
   */
  async getCotrialByDebate(debateId: string): Promise<CotrialWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('cotrials')
      .select('*, debate:debates(*, match:matches(*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)))')
      .eq('debate_id', debateId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取共试失败: ${error.message}`);
    return data as CotrialWithRelations | null;
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
    const { data, error } = await supabaseAdmin
      .from('cotrials')
      .update({
        result: input.result,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', input.cotrialId)
      .select('*, debate:debates(*)')
      .single();

    if (error) throw new Error(`完成共试失败: ${error.message}`);
    return data as CotrialWithRelations;
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
    const isUserA = match?.user_a_id === input.userId;

    // 构建反馈数据
    const feedbackData = {
      satisfaction: input.satisfaction,
      comment: input.comment,
      would_continue: input.wouldContinue,
      rated_at: new Date().toISOString(),
    };

    if (isUserA) {
      const { data, error } = await supabaseAdmin
        .from('cotrials')
        .update({
          feedback_a: feedbackData as unknown,
        })
        .eq('id', input.cotrialId)
        .select('*, debate:debates(*)')
        .single();

      if (error) throw new Error(`评价共试失败: ${error.message}`);
      return data as CotrialWithRelations;
    } else {
      const { data, error } = await supabaseAdmin
        .from('cotrials')
        .update({
          feedback_b: feedbackData as unknown,
        })
        .eq('id', input.cotrialId)
        .select('*, debate:debates(*)')
        .single();

      if (error) throw new Error(`评价共试失败: ${error.message}`);
      return data as CotrialWithRelations;
    }
  }

  /**
   * 删除共试任务
   */
  async deleteCotrial(cotrialId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cotrials')
      .delete()
      .eq('id', cotrialId);

    if (error) {
      throw new Error(`删除共试失败: ${error.message}`);
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
    const isUserA = match?.user_a_id === userId;

    if (isUserA) {
      const { data, error } = await supabaseAdmin
        .from('cotrials')
        .update({
          continued: true,
        })
        .eq('id', cotrialId)
        .select('*, debate:debates(*)')
        .single();

      if (error) throw new Error(`标记继续失败: ${error.message}`);
      return data as CotrialWithRelations;
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
  private async generateTask(debate: DbDebate): Promise<{
    type: string;
    description: string;
    goal: string;
    duration: string;
  }> {
    const systemPrompt = `你是任务规划专家。根据以下争鸣分析结果，生成一个最小化共试任务。

争鸣分析结果：
- 关系建议: ${debate.relationship_suggestion}
- 风险领域: ${(debate.risk_areas || []).join(', ')}
- 下一步建议: ${(debate.next_steps || []).join(', ')}

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

export function getCotrialService(): CotrialService {
  if (!instance) {
    instance = new CotrialService();
  }
  return instance;
}

export function resetCotrialService(): void {
  instance = null;
}
