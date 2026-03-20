/**
 * 知遇卡服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供知遇卡服务
 * [POS]: lib/match/match-service.ts - 知遇卡核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbMatch, DbUser } from '@/lib/supabase/types';

// ============================================
// 类型定义
// ============================================

export interface MatchServiceConfig {}

export interface AcceptMatchInput {
  userId: string;
}

export interface DeclineMatchInput {
  userId: string;
}

type MatchWithRelations = DbMatch & {
  user_a?: DbUser;
  user_b?: DbUser;
  round?: unknown;
  debate?: unknown;
};

// ============================================
// 服务类
// ============================================

export class MatchService {
  private config: MatchServiceConfig;

  constructor(config: MatchServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 创建知遇卡
   */
  async createMatch(data: {
    roundId: string;
    userAId: string;
    userBId: string;
    complementarityScore: number;
    futureGenerativityScore: number;
    overallScore: number;
    relationshipType: string;
    matchReason: string;
    complementarityAreas: string[];
    insights?: unknown;
  }): Promise<MatchWithRelations> {
    const { data: match, error } = await supabaseAdmin
      .from('matches')
      .insert({
        round_id: data.roundId,
        user_a_id: data.userAId,
        user_b_id: data.userBId,
        complementarity_score: data.complementarityScore,
        future_generativity: data.futureGenerativityScore,
        overall_score: data.overallScore,
        relationship_type: data.relationshipType,
        match_reason: data.matchReason,
        complementarity_areas: data.complementarityAreas,
        insights: data.insights || {},
        status: 'pending',
      })
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*), round:rounds(*)')
      .single();

    if (error) throw new Error(`创建知遇卡失败: ${error.message}`);
    return match as MatchWithRelations;
  }

  /**
   * 获取知遇卡
   */
  async getMatch(matchId: string): Promise<MatchWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*), round:rounds(*), debate:debates(*)')
      .eq('id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取知遇卡失败: ${error.message}`);
    return data as MatchWithRelations | null;
  }

  /**
   * 获取圆桌的知遇卡列表
   */
  async getMatchesByRound(roundId: string): Promise<MatchWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
      .eq('round_id', roundId)
      .order('complementarity_score', { ascending: false });

    if (error) throw new Error(`获取知遇卡列表失败: ${error.message}`);
    return (data || []) as MatchWithRelations[];
  }

  /**
   * 获取用户的知遇卡列表
   */
  async getMatchesByUser(userId: string): Promise<MatchWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*), round:rounds(*)')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`获取知遇卡列表失败: ${error.message}`);
    return (data || []) as MatchWithRelations[];
  }

  /**
   * 接受知遇卡
   */
  async acceptMatch(matchId: string, userId: string): Promise<MatchWithRelations> {
    const match = await this.getMatch(matchId);

    if (!match) {
      throw new Error('知遇卡不存在');
    }

    if (match.user_a_id !== userId && match.user_b_id !== userId) {
      throw new Error('无权操作此知遇卡');
    }

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update({ status: 'accepted' })
      .eq('id', matchId)
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*), round:rounds(*)')
      .single();

    if (error) throw new Error(`接受知遇卡失败: ${error.message}`);
    return data as MatchWithRelations;
  }

  /**
   * 拒绝知遇卡
   */
  async declineMatch(matchId: string, userId: string): Promise<MatchWithRelations> {
    const match = await this.getMatch(matchId);

    if (!match) {
      throw new Error('知遇卡不存在');
    }

    if (match.user_a_id !== userId && match.user_b_id !== userId) {
      throw new Error('无权操作此知遇卡');
    }

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update({ status: 'declined' })
      .eq('id', matchId)
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*), round:rounds(*)')
      .single();

    if (error) throw new Error(`拒绝知遇卡失败: ${error.message}`);
    return data as MatchWithRelations;
  }

  /**
   * 获取待处理的知遇卡
   */
  async getPendingMatches(roundId: string): Promise<MatchWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
      .eq('round_id', roundId)
      .eq('status', 'pending');

    if (error) throw new Error(`获取待处理知遇卡失败: ${error.message}`);
    return (data || []) as MatchWithRelations[];
  }
}

// ============================================
// 单例导出
// ============================================

let instance: MatchService | null = null;

export function getMatchService(): MatchService {
  if (!instance) {
    instance = new MatchService();
  }
  return instance;
}

export function resetMatchService(): void {
  instance = null;
}
