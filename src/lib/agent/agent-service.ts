/**
 * Agent 服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供 Agent 服务
 * [POS]: lib/agent/agent-service.ts - Agent 核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbAgent, DbUser } from '@/lib/supabase/types';

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

type AgentWithRelations = DbAgent & {
  user?: DbUser;
};

// ============================================
// 服务类
// ============================================

export class AgentService {
  private config: AgentServiceConfig;

  constructor(config: AgentServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 创建 Agent
   */
  async createAgent(input: CreateAgentInput): Promise<AgentWithRelations> {
    // 验证用户存在
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', input.userId)
      .single();

    if (!user) {
      throw new Error('用户不存在');
    }

    // 检查是否已存在 Agent
    const { data: existingAgent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (existingAgent) {
      throw new Error('用户已创建 Agent');
    }

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert({
        user_id: input.userId,
        name: input.name,
        personality: input.personality,
        expertise: input.expertise || [],
        tone: input.tone || 'friendly',
        is_active: true,
      })
      .select('*, user:users(*)')
      .single();

    if (error) throw new Error(`创建Agent失败: ${error.message}`);
    return data as AgentWithRelations;
  }

  /**
   * 获取 Agent
   */
  async getAgent(agentId: string): Promise<AgentWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('*, user:users(*)')
      .eq('id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取Agent失败: ${error.message}`);
    return data as AgentWithRelations | null;
  }

  /**
   * 按用户 ID 获取 Agent
   */
  async getAgentByUser(userId: string): Promise<AgentWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('*, user:users(*)')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取Agent失败: ${error.message}`);
    return data as AgentWithRelations | null;
  }

  /**
   * 获取 Agent 列表
   */
  async listAgents(options?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ agents: AgentWithRelations[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = supabaseAdmin
      .from('agents')
      .select('*, user:users(*)', { count: 'exact' });

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取Agent列表失败: ${error.message}`);

    return {
      agents: (data || []) as AgentWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 更新 Agent
   */
  async updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentWithRelations> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent 不存在');
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.personality !== undefined) updateData.personality = input.personality;
    if (input.expertise !== undefined) updateData.expertise = input.expertise;
    if (input.tone !== undefined) updateData.tone = input.tone;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await supabaseAdmin
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .select('*, user:users(*)')
      .single();

    if (error) throw new Error(`更新Agent失败: ${error.message}`);
    return data as AgentWithRelations;
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent 不存在');
    }

    const { error } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) throw new Error(`删除Agent失败: ${error.message}`);
  }

  /**
   * 更新 Agent 活跃状态
   */
  async setActive(agentId: string, isActive: boolean): Promise<AgentWithRelations> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({ is_active: isActive })
      .eq('id', agentId)
      .select('*, user:users(*)')
      .single();

    if (error) throw new Error(`更新Agent状态失败: ${error.message}`);
    return data as AgentWithRelations;
  }

  /**
   * 获取活跃的 Agents
   */
  async getActiveAgents(limit: number = 50): Promise<AgentWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('*, user:users(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`获取活跃Agent失败: ${error.message}`);
    return (data || []) as AgentWithRelations[];
  }
}

// ============================================
// 单例导出
// ============================================

let instance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!instance) {
    instance = new AgentService();
  }
  return instance;
}

export function resetAgentService(): void {
  instance = null;
}
