/**
 * [INPUT]: 依赖 lib/supabase/client 的 SupabaseClient
 * [OUTPUT]: 对外提供知遇卡生成器
 * [POS]: lib/bole/card-generator.ts - 伯乐层知遇卡生成
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { Database } from '@/lib/supabase/types';
import type { Round, Message, User, Match } from '@/types';

export interface CardGeneratorConfig {
  minComplementarityScore: number;
  maxMatchesPerRound: number;
}

export interface MatchCandidate {
  userAId: string;
  userBId: string;
  complementarityScore: number;
  futureGenerativity: number;
  overallScore: number;
  relationshipType: 'peer' | 'cofounder' | 'opponent' | 'advisor' | 'none';
  matchReason: string;
  complementarityAreas: string[];
  insights: string[];
}

export class CardGenerator {
  private config: CardGeneratorConfig;

  constructor(config: Partial<CardGeneratorConfig> = {}) {
    this.config = {
      minComplementarityScore: 60,
      maxMatchesPerRound: 3,
      ...config,
    };
  }

  /**
   * 生成知遇卡
   * @param round - 圆桌信息
   * @returns 知遇卡候选列表
   */
  async generateMatches(round: Round): Promise<MatchCandidate[]> {
    // 检查圆桌讨论时长
    const duration = this.calculateRoundDuration(round);
    const minDuration = 5 * 60 * 1000; // 5分钟

    if (duration < minDuration) {
      return [];
    }

    // 获取参与者
    const participants = await this.getRoundParticipants(round.id);
    if (participants.length < 2) {
      return [];
    }

    // 分析消息内容
    const messages = await this.getRoundMessages(round.id);

    // 生成候选配对
    const candidates: MatchCandidate[] = [];

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const userA = participants[i];
        const userB = participants[j];

        // 分析互补性
        const analysis = await this.analyzeComplementarity(
          userA,
          userB,
          messages
        );

        // 过滤低分配对
        if (analysis.complementarityScore < this.config.minComplementarityScore) {
          continue;
        }

        candidates.push({
          userAId: userA.id,
          userBId: userB.id,
          complementarityScore: analysis.complementarityScore,
          futureGenerativity: analysis.futureGenerativity,
          overallScore: analysis.overallScore,
          relationshipType: analysis.relationshipType,
          matchReason: analysis.matchReason,
          complementarityAreas: analysis.complementarityAreas,
          insights: analysis.insights,
        });
      }
    }

    // 按评分排序并限制数量
    return candidates
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, this.config.maxMatchesPerRound);
  }

  /**
   * 计算圆桌讨论时长
   */
  private calculateRoundDuration(round: Round): number {
    const createdAt = new Date(round.createdAt).getTime();
    const now = Date.now();
    return now - createdAt;
  }

  /**
   * 获取圆桌参与者
   */
  private async getRoundParticipants(roundId: string): Promise<User[]> {
    // 实际实现中应该从数据库查询
    // 这里返回模拟数据
    return [];
  }

  /**
   * 获取圆桌消息
   */
  private async getRoundMessages(roundId: string): Promise<Message[]> {
    // 实际实现中应该从数据库查询
    // 这里返回模拟数据
    return [];
  }

  /**
   * 分析两个用户的互补性
   */
  private async analyzeComplementarity(
    userA: User,
    userB: User,
    messages: Message[]
  ): Promise<{
    complementarityScore: number;
    futureGenerativity: number;
    overallScore: number;
    relationshipType: 'peer' | 'cofounder' | 'opponent' | 'advisor' | 'none';
    matchReason: string;
    complementarityAreas: string[];
    insights: string[];
  }> {
    // 模拟分析结果
    // 实际实现中应该使用 AI 进行分析
    return {
      complementarityScore: 75,
      futureGenerativity: 80,
      overallScore: 77.5,
      relationshipType: 'cofounder',
      matchReason: '你们在AI和教育领域有高度互补的专业背景',
      complementarityAreas: ['技术', '教育', '产品设计'],
      insights: [
        '用户A在技术实现上有深度',
        '用户B在教育场景理解上有优势',
        '组合后可能产生创新的教育产品',
      ],
    };
  }
}

// 导出单例实例
export const cardGenerator = new CardGenerator();
