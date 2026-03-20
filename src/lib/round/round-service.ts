/**
 * 圆桌讨论服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供圆桌讨论服务
 * [POS]: lib/round/round-service.ts - 圆桌讨论核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';

console.log('[RoundService] supabaseAdmin:', !!supabaseAdmin);
import type { DbRound, DbTopic, DbRoundParticipant, DbMessage, DbAgent } from '@/lib/supabase/types';

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

type RoundWithRelations = DbRound & {
  topic?: DbTopic;
  participants?: DbRoundParticipant[];
  messages?: DbMessage[];
};

type MessageWithAgent = DbMessage & {
  agent?: DbAgent;
};

// ============================================
// 服务类
// ============================================

export class RoundService {
  private minimaxClient: MinimaxClient;
  private config: RoundServiceConfig;

  constructor(config: RoundServiceConfig = {}) {
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
    console.log('[RoundService.createRound] ========== 开始 ==========');
    console.log('[RoundService.createRound] input:', JSON.stringify(input));
    console.log('[RoundService.createRound] supabaseAdmin exists:', !!supabaseAdmin);
    console.log('[RoundService.createRound] supabaseAdmin._isSingleton:', (supabaseAdmin as any)._isSingleton);

    // 验证话题存在
    const { data: topic } = await supabaseAdmin
      .from('topics')
      .select('id')
      .eq('id', input.topicId)
      .single();

    console.log('[RoundService.createRound] 话题查询结果:', { topic, inputTopicId: input.topicId });

    if (!topic) {
      throw new Error('话题不存在');
    }

    // 创建圆桌
    console.log('[RoundService.createRound] 准备插入圆桌数据...');
    const { data: round, error } = await supabaseAdmin
      .from('rounds')
      .insert({
        topic_id: input.topicId,
        name: input.name,
        description: input.description,
        max_agents: input.maxAgents || 5,
        status: 'waiting',
      })
      .select('*, topic:topics(*)')
      .single();

    console.log('[RoundService.createRound] 圆桌插入结果:', { round, error });

    if (error) throw new Error(`创建圆桌失败: ${error.message}`);
    if (!round?.id) throw new Error('创建圆桌失败：未返回有效的 round id');

    // 创建者自动加入
    console.log('[RoundService.createRound] 准备添加主持人到 round_participants...');
    console.log('[RoundService.createRound] hostId:', input.hostId);
    console.log('[RoundService.createRound] round.id:', round.id);

    const { error: participantError } = await supabaseAdmin
      .from('round_participants')
      .insert({
        round_id: round.id,
        user_id: input.hostId,
        role: 'host',
      });

    console.log('[RoundService.createRound] participantInsert result, error:', participantError);

    if (participantError) {
      // 清理已创建的圆桌
      console.log('[RoundService.createRound] 插入失败，清理圆桌...');
      await supabaseAdmin.from('rounds').delete().eq('id', round.id);
      throw new Error(`创建圆桌失败：无法添加参与者 ${participantError.message}`);
    }

    console.log('[RoundService.createRound] 创建圆桌成功, round:', round);
    return round as RoundWithRelations;
  }

  /**
   * 获取圆桌信息
   */
  async getRound(roundId: string): Promise<RoundWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('rounds')
      .select('*, topic:topics(*), participants:round_participants(*, user:users(*)), messages:messages(*, agent:agents(*))')
      .eq('id', roundId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取圆桌失败: ${error.message}`);
    return data as RoundWithRelations | null;
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
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = supabaseAdmin
      .from('rounds')
      .select('*, topic:topics(*), participants:round_participants(*)', { count: 'exact' });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.topicId) {
      query = query.eq('topic_id', options.topicId);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取圆桌列表失败: ${error.message}`);

    return {
      rounds: (data || []) as RoundWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 获取用户创建的圆桌 (作为 host)
   */
  async getRoundsByHost(userId: string, options?: {
    status?: 'waiting' | 'ongoing' | 'completed';
    limit?: number;
    offset?: number;
  }): Promise<{ rounds: RoundWithRelations[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // 构建查询：直接从 rounds 表查询，通过 round_participants 关联
    let query = supabaseAdmin
      .from('rounds')
      .select(`
        *,
        topic:topics(*),
        participants:round_participants(*, user:users(*))
      `, { count: 'exact' });

    // 如果有状态过滤，先获取符合条件的 round IDs
    if (options?.status) {
      const { data: statusRoundIds } = await supabaseAdmin
        .from('rounds')
        .select('id')
        .eq('status', options.status);

      const validRoundIds = statusRoundIds?.map(r => r.id) || [];
      if (validRoundIds.length === 0) {
        return { rounds: [], total: 0 };
      }
      query = query.in('id', validRoundIds);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取创建的圆桌列表失败: ${error.message}`);

    // 在内存中过滤出 host 为当前用户的圆桌
    const rounds = (data || []).filter(round => {
      const hostParticipant = round.participants?.find(p => p.role === 'host');
      return hostParticipant?.user_id === userId;
    });

    return {
      rounds: rounds as RoundWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 获取用户加入的圆桌 (作为 participant，不包含 host)
   */
  async getRoundsByParticipant(userId: string, options?: {
    status?: 'waiting' | 'ongoing' | 'completed';
    limit?: number;
    offset?: number;
  }): Promise<{ rounds: RoundWithRelations[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // 构建查询：直接从 rounds 表查询
    let query = supabaseAdmin
      .from('rounds')
      .select(`
        *,
        topic:topics(*),
        participants:round_participants(*, user:users(*))
      `, { count: 'exact' });

    // 如果有状态过滤，先获取符合条件的 round IDs
    if (options?.status) {
      const { data: statusRoundIds } = await supabaseAdmin
        .from('rounds')
        .select('id')
        .eq('status', options.status);

      const validRoundIds = statusRoundIds?.map(r => r.id) || [];
      if (validRoundIds.length === 0) {
        return { rounds: [], total: 0 };
      }
      query = query.in('id', validRoundIds);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取加入的圆桌列表失败: ${error.message}`);

    // 在内存中过滤出非 host 且 user_id 匹配当前用户的圆桌
    const rounds = (data || []).filter(round => {
      const hasMatchingParticipant = round.participants?.some(
        p => p.user_id === userId && p.role !== 'host'
      );
      return hasMatchingParticipant;
    });

    return {
      rounds: rounds as RoundWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 开始圆桌
   */
  async startRound(roundId: string): Promise<RoundWithRelations> {
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('*, participants:round_participants(*)')
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status !== 'waiting') {
      throw new Error('圆桌已开始或已结束');
    }

    const { data, error } = await supabaseAdmin
      .from('rounds')
      .update({ status: 'ongoing' })
      .eq('id', roundId)
      .select('*, topic:topics(*), participants:round_participants(*, user:users(*)), messages:messages(*)')
      .single();

    if (error) throw new Error(`开始圆桌失败: ${error.message}`);
    return data as RoundWithRelations;
  }

  /**
   * 结束圆桌
   */
  async completeRound(roundId: string, summary?: string): Promise<RoundWithRelations> {
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('id')
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status !== 'ongoing') {
      throw new Error('圆桌未在进行中');
    }

    const { data, error } = await supabaseAdmin
      .from('rounds')
      .update({
        status: 'completed',
        summary,
      })
      .eq('id', roundId)
      .select('*, topic:topics(*), participants:round_participants(*, user:users(*)), messages:messages(*)')
      .single();

    if (error) throw new Error(`结束圆桌失败: ${error.message}`);
    return data as RoundWithRelations;
  }

  /**
   * 删除圆桌
   */
  async deleteRound(roundId: string): Promise<void> {
    // 先删除关联的参与者
    await supabaseAdmin
      .from('round_participants')
      .delete()
      .eq('round_id', roundId);

    // 删除关联的消息
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('round_id', roundId);

    // 删除圆桌
    const { error } = await supabaseAdmin
      .from('rounds')
      .delete()
      .eq('id', roundId);

    if (error) throw new Error(`删除圆桌失败: ${error.message}`);
  }

  // ============================================
  // 参与者管理
  // ============================================

  /**
   * 加入圆桌
   */
  async joinRound(roundId: string, userId: string): Promise<DbRoundParticipant> {
    // 获取圆桌信息
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('*, participants:round_participants(*)')
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status !== 'waiting') {
      throw new Error('圆桌已开始或已结束');
    }

    if (round.participants && round.participants.length >= round.max_agents) {
      throw new Error('圆桌已满');
    }

    // 检查是否已加入
    const existingParticipant = round.participants?.find(p => p.user_id === userId);
    if (existingParticipant) {
      throw new Error('已加入此圆桌');
    }

    // 加入圆桌
    const { data, error } = await supabaseAdmin
      .from('round_participants')
      .insert({
        round_id: roundId,
        user_id: userId,
        role: 'participant',
      })
      .select()
      .single();

    if (error) throw new Error(`加入圆桌失败: ${error.message}`);
    return data as DbRoundParticipant;
  }

  /**
   * 离开圆桌
   */
  async leaveRound(roundId: string, userId: string): Promise<void> {
    const { data: participant } = await supabaseAdmin
      .from('round_participants')
      .select('id')
      .eq('round_id', roundId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('不是圆桌参与者');
    }

    const { error } = await supabaseAdmin
      .from('round_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('id', participant.id);

    if (error) throw new Error(`离开圆桌失败: ${error.message}`);
  }

  /**
   * 检查用户是否是圆桌参与者
   */
  async isParticipant(roundId: string, userId: string): Promise<boolean> {
    const { data: participant } = await supabaseAdmin
      .from('round_participants')
      .select('id')
      .eq('round_id', roundId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    return !!participant;
  }

  // ============================================
  // 消息管理
  // ============================================

  /**
   * 发送消息
   */
  async sendMessage(input: SendMessageInput): Promise<MessageWithAgent> {
    // 验证圆桌状态
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('id, status')
      .eq('id', input.roundId)
      .single();

    if (!round) {
      throw new Error('圆桌不存在');
    }

    if (round.status === 'completed') {
      throw new Error('圆桌已结束');
    }

    // 验证参与者
    const { data: participants } = await supabaseAdmin
      .from('round_participants')
      .select('user_id')
      .eq('round_id', input.roundId)
      .is('left_at', null);

    const isParticipant = participants?.some(p => p.user_id === input.userId);
    if (!isParticipant) {
      throw new Error('不是圆桌参与者');
    }

    // 获取用户的 Agent
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('user_id', input.userId)
      .single();

    if (!agent) {
      throw new Error('用户没有创建 Agent');
    }

    // 创建消息
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        round_id: input.roundId,
        agent_id: agent.id,
        content: input.content,
        type: input.type || 'text',
        reply_to: input.replyTo,
      })
      .select('*, agent:agents(*)')
      .single();

    if (error) throw new Error(`发送消息失败: ${error.message}`);
    return data as MessageWithAgent;
  }

  /**
   * 获取消息历史
   */
  async getMessages(roundId: string, options?: {
    limit?: number;
    before?: Date;
  }): Promise<MessageWithAgent[]> {
    const limit = options?.limit || 100;

    let query = supabaseAdmin
      .from('messages')
      .select('*, agent:agents(*)')
      .eq('round_id', roundId);

    if (options?.before) {
      query = query.lt('created_at', options.before.toISOString());
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`获取消息历史失败: ${error.message}`);
    return (data || []) as MessageWithAgent[];
  }

  // ============================================
  // Agent 自动回复
  // ============================================

  /**
   * Agent 生成回复
   */
  async generateAgentReply(roundId: string, agent: DbAgent): Promise<MessageWithAgent> {
    // 获取圆桌信息
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('*, topic:topics(*)')
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('圆桌不存在');
    }

    // 获取历史消息
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('*, agent:agents(*)')
      .eq('round_id', roundId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 构建上下文
    const contextMessages = (messages || []).reverse().map(m =>
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
      const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
          round_id: roundId,
          agent_id: agent.id,
          content: replyContent,
          type: 'text',
        })
        .select('*, agent:agents(*)')
        .single();

      if (error) throw new Error(`保存消息失败: ${error.message}`);

      return data as MessageWithAgent;
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
    const { data: round } = await supabaseAdmin
      .from('rounds')
      .select('*, participants:round_participants(*, user:users(*, agent:agents(*)))')
      .eq('id', roundId)
      .single();

    if (!round || round.status !== 'ongoing') {
      throw new Error('圆桌不在进行中');
    }

    // 获取活跃的 Agents
    const agents = round.participants
      ?.filter(p => p.user?.agent?.is_active)
      .map(p => p.user!.agent) || [];

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

export function getRoundService(): RoundService {
  if (!instance) {
    instance = new RoundService();
  }
  return instance;
}

export function resetRoundService(): void {
  instance = null;
}
