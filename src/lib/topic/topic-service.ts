/**
 * 话题服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供话题服务
 * [POS]: lib/topic/topic-service.ts - 话题核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbTopic } from '@/lib/supabase/types';

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

type TopicWithRelations = DbTopic & {
  rounds_count?: number;
};

// ============================================
// 服务类
// ============================================

export class TopicService {
  private config: TopicServiceConfig;

  constructor(config: TopicServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 创建话题
   */
  async createTopic(input: CreateTopicInput): Promise<TopicWithRelations> {
    const { data, error } = await supabaseAdmin
      .from('topics')
      .insert({
        title: input.title,
        description: input.description,
        category: input.category || 'other',
        tags: input.tags || [],
        zhihu_id: input.zhihuId,
        zhihu_url: input.zhihuUrl,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw new Error(`创建话题失败: ${error.message}`);
    return data as TopicWithRelations;
  }

  /**
   * 获取话题
   */
  async getTopic(topicId: string): Promise<TopicWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取话题失败: ${error.message}`);
    return data as TopicWithRelations | null;
  }

  /**
   * 获取话题列表
   */
  async listTopics(options?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
    source?: 'zhihu_billboard';
  }): Promise<{ topics: TopicWithRelations[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = supabaseAdmin
      .from('topics')
      .select('*', { count: 'exact' });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    // 知乎热榜来源的话题（有 zhihu_id）
    if (options?.source === 'zhihu_billboard') {
      query = query.not('zhihu_id', 'is', null);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取话题列表失败: ${error.message}`);

    return {
      topics: (data || []) as TopicWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 更新话题
   */
  async updateTopic(topicId: string, input: UpdateTopicInput): Promise<TopicWithRelations> {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabaseAdmin
      .from('topics')
      .update(updateData)
      .eq('id', topicId)
      .select()
      .single();

    if (error) throw new Error(`更新话题失败: ${error.message}`);
    return data as TopicWithRelations;
  }

  /**
   * 删除话题
   */
  async deleteTopic(topicId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('topics')
      .delete()
      .eq('id', topicId);

    if (error) throw new Error(`删除话题失败: ${error.message}`);
  }

  /**
   * 获取热门话题
   */
  async getHotTopics(limit: number = 10): Promise<TopicWithRelations[]> {
    // 获取有活跃圆桌的话题
    const { data, error } = await supabaseAdmin
      .from('topics')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`获取热门话题失败: ${error.message}`);
    return (data || []) as TopicWithRelations[];
  }
}

// ============================================
// 单例导出
// ============================================

let instance: TopicService | null = null;

export function getTopicService(): TopicService {
  if (!instance) {
    instance = new TopicService();
  }
  return instance;
}

export function resetTopicService(): void {
  instance = null;
}
