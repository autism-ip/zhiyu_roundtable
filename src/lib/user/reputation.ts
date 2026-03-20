/**
 * 信誉服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供用户信誉评分和能力标签服务
 * [POS]: lib/user/reputation.ts - 信誉系统核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';

// =============================================================================
// 类型定义
// =============================================================================

export interface ReputationScore {
  overall: number;           // 综合评分 0-100
  expertise: number;         // 专业能力 0-100
  collaboration: number;     // 协作表现 0-100
  responseRate: number;     // 响应率 0-100
  completionRate: number;   // 完成率 0-100
}

export interface SkillTag {
  id: string;
  name: string;
  category: 'expertise' | 'collaboration' | 'growth';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
}

export interface UserReputation {
  userId: string;
  scores: ReputationScore;
  tags: SkillTag[];
  rank?: number;
  totalMatches: number;
  completedRounds: number;
}

export interface ReputationServiceConfig {
  weights?: {
    expertise?: number;
    collaboration?: number;
    responseRate?: number;
    completionRate?: number;
  };
}

// =============================================================================
// 常量
// =============================================================================

const DEFAULT_WEIGHTS = {
  expertise: 0.35,
  collaboration: 0.25,
  responseRate: 0.20,
  completionRate: 0.20,
};

// 信誉等级划分
const REPUTATION_LEVELS = [
  { min: 90, label: 'Expert', color: '#FFD700' },
  { min: 75, label: 'Advanced', color: '#C0C0C0' },
  { min: 60, label: 'Intermediate', color: '#CD7F32' },
  { min: 0, label: 'Beginner', color: '#808080' },
];

// 技能标签类型
const SKILL_CATEGORIES = ['expertise', 'collaboration', 'growth'] as const;
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

// =============================================================================
// 信誉服务类
// =============================================================================

export class ReputationService {
  private config: ReputationServiceConfig;

  constructor(config: ReputationServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 计算用户信誉评分
   */
  async calculateReputation(userId: string): Promise<UserReputation> {
    const weights = {
      ...DEFAULT_WEIGHTS,
      ...this.config.weights,
    };

    // 获取用户相关数据
    const [matches, rounds, auditLogs] = await Promise.all([
      this.getUserMatches(userId),
      this.getUserRounds(userId),
      this.getUserAuditLogs(userId),
    ]);

    // 计算各项评分
    const expertise = this.calculateExpertiseScore(matches, rounds);
    const collaboration = this.calculateCollaborationScore(auditLogs);
    const responseRate = this.calculateResponseRate(auditLogs);
    const completionRate = this.calculateCompletionRate(matches, rounds);

    // 计算综合评分
    const overall = Math.round(
      expertise * weights.expertise +
      collaboration * weights.collaboration +
      responseRate * weights.responseRate +
      completionRate * weights.completionRate
    );

    // 生成技能标签
    const tags = this.generateSkillTags(expertise, collaboration, matches);

    return {
      userId,
      scores: {
        overall,
        expertise,
        collaboration,
        responseRate,
        completionRate,
      },
      tags,
      totalMatches: matches.length,
      completedRounds: rounds.filter(r => r.status === 'completed').length,
    };
  }

  /**
   * 获取用户排名
   */
  async getUserRank(userId: string): Promise<number> {
    const userRep = await this.calculateReputation(userId);

    // 获取所有用户的信誉评分
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id');

    if (!users) return 0;

    // 这里简化处理，实际应该预先计算好排名
    let higherCount = 0;
    for (const user of users) {
      if (user.id === userId) continue;
      const otherRep = await this.getSimpleReputation(user.id);
      if (otherRep > userRep.scores.overall) {
        higherCount++;
      }
    }

    return higherCount + 1;
  }

  /**
   * 获取用户信誉历史变化
   */
  async getReputationHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; score: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .eq('actor_type', 'user')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (!auditLogs) return [];

    // 按天聚合计算信誉变化
    const dailyScores: Record<string, number[]> = {};

    for (const log of auditLogs) {
      const date = log.timestamp.split('T')[0];
      if (!dailyScores[date]) {
        dailyScores[date] = [];
      }
      // 根据事件类型给予不同的信誉变化
      const scoreChange = this.getScoreChangeForAction(log.action);
      dailyScores[date].push(scoreChange);
    }

    // 计算每天的平均信誉变化并累积
    let cumulativeScore = 50; // 初始分数
    const history: Array<{ date: string; score: number }> = [];

    for (const [date, changes] of Object.entries(dailyScores)) {
      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      cumulativeScore = Math.min(100, Math.max(0, cumulativeScore + avgChange));
      history.push({ date, score: Math.round(cumulativeScore) });
    }

    return history;
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 获取用户匹配数据
   */
  private async getUserMatches(userId: string) {
    const { data } = await supabaseAdmin
      .from('matches')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    return data || [];
  }

  /**
   * 获取用户参与的圆桌
   */
  private async getUserRounds(userId: string) {
    // 先获取用户参与的参与者记录
    const { data: participants } = await supabaseAdmin
      .from('round_participants')
      .select('round_id')
      .eq('user_id', userId);

    if (!participants || participants.length === 0) return [];

    const roundIds = participants.map(p => p.round_id);

    const { data: rounds } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .in('id', roundIds);

    return rounds || [];
  }

  /**
   * 获取用户审计日志
   */
  private async getUserAuditLogs(userId: string) {
    const { data } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    return data || [];
  }

  /**
   * 获取简化信誉评分（用于排名计算）
   */
  private async getSimpleReputation(userId: string): Promise<number> {
    const matches = await this.getUserMatches(userId);
    const rounds = await this.getUserRounds(userId);

    const expertise = this.calculateExpertiseScore(matches, rounds);
    const collaboration = 50; // 默认值
    const responseRate = 50;
    const completionRate = this.calculateCompletionRate(matches, rounds);

    return Math.round(
      expertise * 0.35 +
      collaboration * 0.25 +
      responseRate * 0.20 +
      completionRate * 0.20
    );
  }

  /**
   * 计算专业能力评分
   */
  private calculateExpertiseScore(matches: any[], rounds: any[]): number {
    if (matches.length === 0) return 0;

    // 基于匹配质量和圆桌参与计算
    const avgMatchScore = matches.reduce((sum, m) => {
      return sum + (m.overall_score || 0);
    }, 0) / matches.length;

    // 考虑参与圆桌数量和质量
    const roundScore = Math.min(matches.length * 5, 30);

    return Math.min(100, Math.round(avgMatchScore * 0.7 + roundScore));
  }

  /**
   * 计算协作表现评分
   */
  private calculateCollaborationScore(auditLogs: any[]): number {
    if (auditLogs.length === 0) return 0;

    // 统计正面行为和负面行为
    const positiveActions = [
      'round.joined',
      'round.completed',
      'match.accepted',
      'cotrial.completed',
    ];

    const negativeActions = [
      'round.left',
      'match.declined',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const log of auditLogs) {
      if (positiveActions.includes(log.action)) {
        positiveCount++;
      } else if (negativeActions.includes(log.action)) {
        negativeCount++;
      }
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return 50;

    const ratio = positiveCount / total;
    return Math.round(ratio * 100);
  }

  /**
   * 计算响应率
   */
  private calculateResponseRate(auditLogs: any[]): number {
    const totalDebateActions = auditLogs.filter(
      log => log.action === 'debate.initiated' || log.action === 'debate.responded'
    ).length;

    const respondedActions = auditLogs.filter(
      log => log.action === 'debate.responded'
    ).length;

    if (totalDebateActions === 0) return 100; // 无需响应的默认100

    return Math.round((respondedActions / totalDebateActions) * 100);
  }

  /**
   * 计算完成率
   */
  private calculateCompletionRate(matches: any[], rounds: any[]): number {
    const totalItems = matches.length + rounds.length;
    if (totalItems === 0) return 0;

    const completedMatches = matches.filter(
      m => m.status === 'accepted' || m.status === 'completed'
    ).length;

    const completedRounds = rounds.filter(
      r => r.status === 'completed'
    ).length;

    return Math.round(((completedMatches + completedRounds) / totalItems) * 100);
  }

  /**
   * 根据操作类型获取信誉变化
   */
  private getScoreChangeForAction(action: string): number {
    const positiveActions: Record<string, number> = {
      'round.completed': 5,
      'round.joined': 2,
      'match.accepted': 3,
      'cotrial.completed': 8,
      'debate.completed': 5,
    };

    const negativeActions: Record<string, number> = {
      'round.left': -5,
      'match.declined': -3,
    };

    return positiveActions[action] || negativeActions[action] || 0;
  }

  /**
   * 生成技能标签
   */
  private generateSkillTags(
    expertise: number,
    collaboration: number,
    matches: any[]
  ): SkillTag[] {
    const tags: SkillTag[] = [];

    // 基于专业评分生成专业标签
    if (expertise >= 80) {
      tags.push({
        id: 'expert-001',
        name: '领域专家',
        category: 'expertise',
        level: 'expert',
        verified: true,
      });
    } else if (expertise >= 60) {
      tags.push({
        id: 'adv-001',
        name: '进阶用户',
        category: 'expertise',
        level: 'advanced',
        verified: false,
      });
    }

    // 基于协作评分生成协作标签
    if (collaboration >= 80) {
      tags.push({
        id: 'collab-001',
        name: '最佳协作者',
        category: 'collaboration',
        level: 'expert',
        verified: true,
      });
    } else if (collaboration >= 60) {
      tags.push({
        id: 'collab-002',
        name: '活跃参与者',
        category: 'collaboration',
        level: 'intermediate',
        verified: false,
      });
    }

    // 基于匹配数量生成成长标签
    if (matches.length >= 10) {
      tags.push({
        id: 'growth-001',
        name: '资深用户',
        category: 'growth',
        level: 'advanced',
        verified: true,
      });
    } else if (matches.length >= 3) {
      tags.push({
        id: 'growth-002',
        name: '新星用户',
        category: 'growth',
        level: 'intermediate',
        verified: false,
      });
    }

    return tags;
  }
}

// =============================================================================
// 单例导出
// =============================================================================

let instance: ReputationService | null = null;

export function getReputationService(): ReputationService {
  if (!instance) {
    instance = new ReputationService();
  }
  return instance;
}

export function resetReputationService(): void {
  instance = null;
}
