/**
 * 成长服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供用户积分和成就徽章服务
 * [POS]: lib/user/growth.ts - 成长体系核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';

// =============================================================================
// 类型定义
// =============================================================================

export interface UserPoints {
  total: number;          // 总积分
  roundPoints: number;    // 圆桌积分
  matchPoints: number;     // 知遇积分
  debatePoints: number;    // 争鸣积分
  cotrialPoints: number;   // 共试积分
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'round' | 'match' | 'debate' | 'cotrial' | 'special';
  icon: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'count' | 'score' | 'streak' | 'special';
    value: number;
    metric: string;
  };
  unlockedAt?: string;
}

export interface UserAchievement {
  achievement: Achievement;
  unlockedAt: string;
  progress?: number;
}

export interface UserGrowth {
  userId: string;
  points: UserPoints;
  level: number;
  levelName: string;
  achievements: UserAchievement[];
  nextLevelPoints: number;
  pointsToNextLevel: number;
}

export interface GrowthServiceConfig {}

// =============================================================================
// 常量
// =============================================================================

// 等级名称
const LEVEL_NAMES = [
  '初出茅庐',   // 1-99
  '崭露头角',   // 100-299
  '小有名气',   // 300-599
  '声名鹊起',   // 600-999
  '如日中天',   // 1000-1999
  '登峰造极',   // 2000+
];

// 每级需要的积分
const POINTS_PER_LEVEL = 100;

// 积分规则
const POINTS_RULES = {
  round: {
    join: 5,
    complete: 15,
    create: 10,
  },
  match: {
    generate: 10,
    accept: 20,
    decline: -5,
  },
  debate: {
    initiate: 10,
    respond: 10,
    complete: 25,
  },
  cotrial: {
    assign: 15,
    complete: 30,
    rate: 5,
  },
};

// 成就定义
const ACHIEVEMENTS: Achievement[] = [
  // 圆桌成就
  {
    id: 'round-first',
    name: '初试啼声',
    description: '参加第一次圆桌讨论',
    category: 'round',
    icon: '🎯',
    level: 'bronze',
    requirement: { type: 'count', value: 1, metric: 'rounds_joined' },
  },
  {
    id: 'round-active',
    name: '活跃分子',
    description: '参加10次圆桌讨论',
    category: 'round',
    icon: '🔥',
    level: 'silver',
    requirement: { type: 'count', value: 10, metric: 'rounds_joined' },
  },
  {
    id: 'round-master',
    name: '圆桌大师',
    description: '参加50次圆桌讨论',
    category: 'round',
    icon: '👑',
    level: 'gold',
    requirement: { type: 'count', value: 50, metric: 'rounds_joined' },
  },

  // 知遇成就
  {
    id: 'match-first',
    name: '知遇之恩',
    description: '获得第一张知遇卡',
    category: 'match',
    icon: '💝',
    level: 'bronze',
    requirement: { type: 'count', value: 1, metric: 'matches_received' },
  },
  {
    id: 'match-popular',
    name: '人气之星',
    description: '获得10张知遇卡',
    category: 'match',
    icon: '⭐',
    level: 'silver',
    requirement: { type: 'count', value: 10, metric: 'matches_received' },
  },
  {
    id: 'match-magnet',
    name: '知遇磁石',
    description: '获得50张知遇卡',
    category: 'match',
    icon: '🧲',
    level: 'gold',
    requirement: { type: 'count', value: 50, metric: 'matches_received' },
  },

  // 争鸣成就
  {
    id: 'debate-first',
    name: '初露锋芒',
    description: '完成第一次争鸣对练',
    category: 'debate',
    icon: '⚔️',
    level: 'bronze',
    requirement: { type: 'count', value: 1, metric: 'debates_completed' },
  },
  {
    id: 'debate-warrior',
    name: '争鸣勇士',
    description: '完成20次争鸣对练',
    category: 'debate',
    icon: '🏆',
    level: 'silver',
    requirement: { type: 'count', value: 20, metric: 'debates_completed' },
  },

  // 共试成就
  {
    id: 'cotrial-first',
    name: '共试先锋',
    description: '完成第一次共试任务',
    category: 'cotrial',
    icon: '🚀',
    level: 'bronze',
    requirement: { type: 'count', value: 1, metric: 'cotrials_completed' },
  },
  {
    id: 'cotrial-champion',
    name: '共试冠军',
    description: '完成10次共试任务',
    category: 'cotrial',
    icon: '🎖️',
    level: 'gold',
    requirement: { type: 'count', value: 10, metric: 'cotrials_completed' },
  },

  // 特殊成就
  {
    id: 'special-early-bird',
    name: '早起的鸟儿',
    description: '在项目早期阶段加入',
    category: 'special',
    icon: '🐦',
    level: 'platinum',
    requirement: { type: 'special', value: 0, metric: 'early_adopter' },
  },
  {
    id: 'special-connector',
    name: '连接者',
    description: '成功建立5对连接',
    category: 'special',
    icon: '🔗',
    level: 'gold',
    requirement: { type: 'count', value: 5, metric: 'connections_made' },
  },
];

// =============================================================================
// 成长服务类
// =============================================================================

export class GrowthService {
  private config: GrowthServiceConfig;

  constructor(config: GrowthServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 获取用户成长数据
   */
  async getUserGrowth(userId: string): Promise<UserGrowth> {
    // 获取积分和成就
    const [points, userAchievements] = await Promise.all([
      this.calculatePoints(userId),
      this.getUserAchievements(userId),
    ]);

    // 计算等级
    const level = this.calculateLevel(points.total);
    const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] || LEVEL_NAMES[0];
    const nextLevelPoints = level * POINTS_PER_LEVEL;
    const pointsToNextLevel = nextLevelPoints - points.total;

    return {
      userId,
      points,
      level,
      levelName,
      achievements: userAchievements,
      nextLevelPoints,
      pointsToNextLevel: Math.max(0, pointsToNextLevel),
    };
  }

  /**
   * 计算用户积分
   */
  async calculatePoints(userId: string): Promise<UserPoints> {
    // 获取用户相关数据
    const [matches, rounds, debates, cotrials] = await Promise.all([
      this.getUserMatches(userId),
      this.getUserRounds(userId),
      this.getUserDebates(userId),
      this.getUserCotrials(userId),
    ]);

    // 计算各类积分
    const roundPoints =
      rounds.filter(r => r.joined_at).length * POINTS_RULES.round.join +
      rounds.filter(r => r.status === 'completed').length * POINTS_RULES.round.complete;

    const matchPoints =
      matches.length * POINTS_RULES.match.generate +
      matches.filter(m => m.status === 'accepted').length * POINTS_RULES.match.accept;

    const debatePoints =
      debates.filter(d => d.status !== 'waiting').length * POINTS_RULES.debate.initiate +
      debates.filter(d => d.status === 'completed').length * POINTS_RULES.debate.complete;

    const cotrialPoints =
      cotrials.filter(c => c.status !== 'waiting').length * POINTS_RULES.cotrial.assign +
      cotrials.filter(c => c.completed).length * POINTS_RULES.cotrial.complete;

    return {
      total: roundPoints + matchPoints + debatePoints + cotrialPoints,
      roundPoints,
      matchPoints,
      debatePoints,
      cotrialPoints,
    };
  }

  /**
   * 获取用户成就
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    // 获取用户统计数据
    const stats = await this.getUserStats(userId);

    // 获取已解锁的成就
    const { data: unlockedAchievements } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    const unlockedMap = new Map<string, string>(
      (unlockedAchievements || []).map((ua: any) => [ua.achievement_id, String(ua.unlocked_at)])
    );

    // 检查每个成就是否满足条件
    const userAchievements: UserAchievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = unlockedMap.has(achievement.id);
      const progress = this.calculateProgress(achievement, stats);

      if (isUnlocked) {
        userAchievements.push({
          achievement,
          unlockedAt: unlockedMap.get(achievement.id)!,
          progress: 100,
        });
      } else if (progress > 0) {
        userAchievements.push({
          achievement,
          unlockedAt: '',
          progress,
        });
      }
    }

    // 按等级排序
    const levelOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    userAchievements.sort((a, b) =>
      levelOrder[a.achievement.level] - levelOrder[b.achievement.level]
    );

    return userAchievements;
  }

  /**
   * 解锁成就
   */
  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return false;

    // 检查是否已解锁
    const { data: existing } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (existing) return false; // 已解锁

    // 插入新成就
    const { error } = await supabaseAdmin
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
      });

    if (error) {
      console.error('解锁成就失败:', error);
      return false;
    }

    return true;
  }

  /**
   * 添加积分
   */
  async addPoints(userId: string, category: keyof typeof POINTS_RULES, action: keyof typeof POINTS_RULES.round): Promise<number> {
    const points = POINTS_RULES[category][action as keyof typeof POINTS_RULES.round];

    // 记录积分变动
    const { error } = await supabaseAdmin
      .from('point_transactions')
      .insert({
        user_id: userId,
        category,
        action,
        points_delta: points,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('添加积分失败:', error);
      return 0;
    }

    return points;
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
    const { data: participants } = await supabaseAdmin
      .from('round_participants')
      .select('round_id, joined_at')
      .eq('user_id', userId);

    if (!participants || participants.length === 0) return [];

    const roundIds = participants.map(p => p.round_id);

    const { data: rounds } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .in('id', roundIds);

    // 合并参与者信息
    return (rounds || []).map((round: any) => {
      const participant = participants.find((p: any) => p.round_id === round.id);
      return { ...round, joined_at: participant?.joined_at };
    });
  }

  /**
   * 获取用户争鸣数据
   */
  private async getUserDebates(userId: string) {
    // 获取用户相关的匹配
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    if (!matches || matches.length === 0) return [];

    const matchIds = matches.map(m => m.id);

    const { data: debates } = await supabaseAdmin
      .from('debates')
      .select('*')
      .in('match_id', matchIds);

    return debates || [];
  }

  /**
   * 获取用户共试数据
   */
  private async getUserCotrials(userId: string) {
    // 获取用户相关的争鸣
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    if (!matches || matches.length === 0) return [];

    const matchIds = matches.map(m => m.id);

    const { data: debates } = await supabaseAdmin
      .from('debates')
      .select('id')
      .in('match_id', matchIds);

    if (!debates || debates.length === 0) return [];

    const debateIds = debates.map(d => d.id);

    const { data: cotrials } = await supabaseAdmin
      .from('cotrials')
      .select('*')
      .in('debate_id', debateIds);

    return cotrials || [];
  }

  /**
   * 获取用户统计数据
   */
  private async getUserStats(userId: string) {
    const [matches, rounds, debates, cotrials] = await Promise.all([
      this.getUserMatches(userId),
      this.getUserRounds(userId),
      this.getUserDebates(userId),
      this.getUserCotrials(userId),
    ]);

    return {
      rounds_joined: rounds.filter(r => r.joined_at).length,
      matches_received: matches.length,
      matches_accepted: matches.filter(m => m.status === 'accepted').length,
      debates_completed: debates.filter(d => d.status === 'completed').length,
      cotrials_completed: cotrials.filter(c => c.completed).length,
      connections_made: matches.filter(m => m.status === 'accepted').length,
    };
  }

  /**
   * 计算等级
   */
  private calculateLevel(totalPoints: number): number {
    return Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
  }

  /**
   * 计算成就进度
   */
  private calculateProgress(achievement: Achievement, stats: Record<string, number>): number {
    const { type, value, metric } = achievement.requirement;

    if (type === 'special') {
      // 特殊成就需要额外逻辑
      return 0;
    }

    const currentValue = stats[metric] || 0;
    const progress = Math.min(100, Math.round((currentValue / value) * 100));

    return progress;
  }
}

// =============================================================================
// 单例导出
// =============================================================================

let instance: GrowthService | null = null;

export function getGrowthService(): GrowthService {
  if (!instance) {
    instance = new GrowthService();
  }
  return instance;
}

export function resetGrowthService(): void {
  instance = null;
}
