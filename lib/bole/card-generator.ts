/**
 * [INPUT]: 依赖 lib/supabase/client 的 SupabaseClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供知遇卡生成器
 * [POS]: lib/bole/card-generator.ts - 伯乐层知遇卡生成
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { Round, Message, User, Match } from '@/types';

export interface CardGeneratorConfig {
  minComplementarityScore: number;
  maxMatchesPerRound: number;
  minimaxModel?: string;
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

/**
 * Minimax AI 返回的互补性分析结果
 */
interface MinimaxComplementarityResult {
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
  private minimaxClient: MinimaxClient;

  constructor(config: Partial<CardGeneratorConfig> = {}) {
    this.config = {
      minComplementarityScore: 60,
      maxMatchesPerRound: 3,
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
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
   * TODO: 后续接入真实数据库
   */
  private async getRoundParticipants(roundId: string): Promise<User[]> {
    // TODO: 从 Prisma/Supabase 查询
    // const participants = await prisma.roundUser.findMany({...})
    return [];
  }

  /**
   * 获取圆桌消息
   * TODO: 后续接入真实数据库
   */
  private async getRoundMessages(roundId: string): Promise<Message[]> {
    // TODO: 从 Prisma/Supabase 查询
    // const messages = await prisma.message.findMany({...})
    return [];
  }

  /**
   * 分析两个用户的互补性 - 使用 Minimax AI
   */
  private async analyzeComplementarity(
    userA: User,
    userB: User,
    messages: Message[]
  ): Promise<MinimaxComplementarityResult> {
    // 构建系统提示词
    const systemPrompt = `你是知遇圆桌的伯乐层分析专家。你的任务是根据用户的讨论内容，分析两个用户之间的互补性，并生成知遇卡。

分析维度：
1. 互补性评分 (0-100)：用户在专业背景、思维方式、技能树上的互补程度
2. 未来生成性评分 (0-100)：用户组合后能产生新价值、新想法的潜力
3. 综合评分 (0-100)：基于互补性和未来生成性的加权平均
4. 关系类型：cofounder(共创搭子)、peer(同道)、opponent(对手)、advisor(顾问)、none(暂不建议)
5. 互补领域：用户A和用户B各自的优势领域
6. 洞察：对这对用户的深入分析

请严格按照JSON格式输出，不要包含任何解释或额外文本。`;

    // 构建用户提示词
    const userPrompt = `请分析以下两位用户在圆桌讨论中的互补性：

用户A：
- 名字：${userA.name || '未知'}
- 兴趣：${(userA.interests || []).join(', ')}
- 期望连接类型：${(userA.connectionTypes || []).join(', ')}

用户B：
- 名字：${userB.name || '未知'}
- 兴趣：${(userB.interests || []).join(', ')}
- 期望连接类型：${(userB.connectionTypes || []).join(', ')}

圆桌讨论内容：
${messages.map(m => `- ${m.content}`).join('\n')}

请基于以上信息，生成互补性分析结果。`;

    try {
      // 调用 Minimax API
      const result = await this.minimaxClient.chatJSON<MinimaxComplementarityResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 2048,
        }
      );

      // 验证返回结果
      return {
        complementarityScore: Math.max(0, Math.min(100, result.complementarityScore || 0)),
        futureGenerativity: Math.max(0, Math.min(100, result.futureGenerativity || 0)),
        overallScore: Math.max(0, Math.min(100, result.overallScore || 0)),
        relationshipType: this.validateRelationshipType(result.relationshipType),
        matchReason: result.matchReason || '基于讨论内容的分析',
        complementarityAreas: result.complementarityAreas || [],
        insights: result.insights || [],
      };
    } catch (error) {
      console.error('Minimax API 调用失败:', error);
      // 返回兜底数据
      return this.getFallbackResult();
    }
  }

  /**
   * 验证关系类型有效性
   */
  private validateRelationshipType(type: string): MatchCandidate['relationshipType'] {
    const validTypes: MatchCandidate['relationshipType'][] = [
      'peer', 'cofounder', 'opponent', 'advisor', 'none'
    ];
    return validTypes.includes(type as any) ? type as MatchCandidate['relationshipType'] : 'none';
  }

  /**
   * 获取兜底结果
   */
  private getFallbackResult(): MinimaxComplementarityResult {
    return {
      complementarityScore: 60,
      futureGenerativity: 60,
      overallScore: 60,
      relationshipType: 'peer',
      matchReason: '分析服务暂时不可用',
      complementarityAreas: [],
      insights: ['AI分析暂时不可用'],
    };
  }
}

// 导出单例实例
export const cardGenerator = new CardGenerator();
