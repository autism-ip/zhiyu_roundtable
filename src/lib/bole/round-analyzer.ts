/**
 * 圆桌分析器
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供圆桌分析服务
 * [POS]: lib/bole/round-analyzer.ts - 伯乐层圆桌分析核心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { DbRound, DbMessage, DbUser, DbRoundParticipant } from '@/lib/supabase/types';

// ============================================
// 类型定义
// ============================================

export interface RoundAnalyzerConfig {
  minMessagesForAnalysis: number;
  minDiscussionDuration: number; // ms
  minimaxModel?: string;
}

export interface RoundAnalysisResult {
  roundId: string;
  discussionQuality: number; // 0-100
  participationScore: number; // 0-100
  topicAlignment: number; // 0-100
  consensusLevel: number; // 0-100
  keyInsights: string[];
  discussedTopics: string[];
  participantInsights: ParticipantInsight[];
  relationshipDynamics: RelationshipDynamics;
  recommendation: string;
}

export interface ParticipantInsight {
  userId: string;
  userName: string | null;
  contributionScore: number; // 0-100
  perspectiveType: 'analytical' | 'creative' | 'practical' | 'collaborative';
  keyPositions: string[];
  alignmentWithOthers: number; // 0-100
}

export interface RelationshipDynamics {
  consensusTopics: string[];
  conflictTopics: string[];
  collaborativePairs: Array<{ userAId: string; userBId: string; score: number }>;
  opposingPairs: Array<{ userAId: string; userBId: string; score: number }>;
}

/**
 * Minimax AI 返回的圆桌分析结果
 */
interface MinimaxRoundAnalysisResult {
  discussionQuality: number;
  participationScore: number;
  topicAlignment: number;
  consensusLevel: number;
  keyInsights: string[];
  discussedTopics: string[];
  participantInsights: Array<{
    userId: string;
    contributionScore: number;
    perspectiveType: 'analytical' | 'creative' | 'practical' | 'collaborative';
    keyPositions: string[];
    alignmentWithOthers: number;
  }>;
  relationshipDynamics: {
    consensusTopics: string[];
    conflictTopics: string[];
    collaborativePairs: Array<{ userAId: string; userBId: string; score: number }>;
    opposingPairs: Array<{ userAId: string; userBId: string; score: number }>;
  };
  recommendation: string;
}

// ============================================
// 服务类
// ============================================

export class RoundAnalyzer {
  private config: Required<RoundAnalyzerConfig>;
  private minimaxClient: MinimaxClient;

  constructor(config: Partial<RoundAnalyzerConfig> = {}) {
    this.config = {
      minMessagesForAnalysis: config.minMessagesForAnalysis ?? 5,
      minDiscussionDuration: config.minDiscussionDuration ?? 5 * 60 * 1000, // 5分钟
      minimaxModel: config.minimaxModel ?? 'abab6.5s-chat',
    };
    this.minimaxClient = getMinimaxClient();
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 分析圆桌讨论
   */
  async analyzeRound(roundId: string): Promise<RoundAnalysisResult> {
    // 获取圆桌信息
    const round = await this.getRound(roundId);
    if (!round) {
      throw new Error('圆桌不存在');
    }

    // 获取消息
    const messages = await this.getRoundMessages(roundId);
    if (messages.length < this.config.minMessagesForAnalysis) {
      return this.getFallbackAnalysis(roundId);
    }

    // 获取参与者
    const participants = await this.getRoundParticipants(roundId);
    if (participants.length < 2) {
      return this.getFallbackAnalysis(roundId);
    }

    // 使用 AI 分析
    const analysis = await this.analyzeWithAI(round, messages, participants);

    return {
      roundId,
      ...analysis,
    };
  }

  /**
   * 获取讨论质量评分
   */
  async getDiscussionQuality(roundId: string): Promise<number> {
    const analysis = await this.analyzeRound(roundId);
    return analysis.discussionQuality;
  }

  /**
   * 获取参与者贡献评分
   */
  async getParticipantContributions(
    roundId: string
  ): Promise<Map<string, number>> {
    const analysis = await this.analyzeRound(roundId);
    const contributions = new Map<string, number>();

    for (const participant of analysis.participantInsights) {
      contributions.set(participant.userId, participant.contributionScore);
    }

    return contributions;
  }

  /**
   * 检查是否适合生成知遇卡
   */
  async isReadyForMatching(roundId: string): Promise<{
    ready: boolean;
    reason: string;
    qualityScore: number;
  }> {
    const round = await this.getRound(roundId);
    if (!round) {
      return { ready: false, reason: '圆桌不存在', qualityScore: 0 };
    }

    const duration = this.calculateDuration(round);
    if (duration < this.config.minDiscussionDuration) {
      return {
        ready: false,
        reason: `讨论时长不足 ${this.config.minDiscussionDuration / 1000 / 60} 分钟`,
        qualityScore: 0,
      };
    }

    const messages = await this.getRoundMessages(roundId);
    if (messages.length < this.config.minMessagesForAnalysis) {
      return {
        ready: false,
        reason: `消息数量不足 ${this.config.minMessagesForAnalysis} 条`,
        qualityScore: 0,
      };
    }

    const analysis = await this.analyzeRound(roundId);
    return {
      ready: analysis.discussionQuality >= 50,
      reason: analysis.discussionQuality >= 50 ? '适合生成知遇卡' : '讨论质量不足',
      qualityScore: analysis.discussionQuality,
    };
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 获取圆桌信息
   */
  private async getRound(roundId: string): Promise<DbRound | null> {
    const { data } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    return data;
  }

  /**
   * 获取圆桌消息
   */
  private async getRoundMessages(roundId: string): Promise<DbMessage[]> {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: true });

    return (data || []) as DbMessage[];
  }

  /**
   * 获取圆桌参与者
   */
  private async getRoundParticipants(
    roundId: string
  ): Promise<DbUser[]> {
    const { data } = await supabaseAdmin
      .from('round_participants')
      .select('user:users(*)')
      .eq('round_id', roundId);

    return (data || [])
      .map((p: { user?: DbUser }) => p.user)
      .filter((u): u is DbUser => Boolean(u));
  }

  /**
   * 计算讨论时长
   */
  private calculateDuration(round: DbRound): number {
    const createdAt = new Date(round.created_at).getTime();
    const now = Date.now();
    return now - createdAt;
  }

  /**
   * 使用 AI 分析圆桌
   */
  private async analyzeWithAI(
    round: DbRound,
    messages: DbMessage[],
    participants: DbUser[]
  ): Promise<Omit<RoundAnalysisResult, 'roundId'>> {
    const systemPrompt = `你是圆桌讨论分析专家。你的任务是对圆桌讨论进行深入分析，评估讨论质量和参与者表现。

分析维度：
1. discussionQuality (0-100): 整体讨论质量，考虑深度、创新性、逻辑性
2. participationScore (0-100): 参与度，考虑发言均衡性、积极性
3. topicAlignment (0-100): 话题聚焦度，考虑是否偏离主题
4. consensusLevel (0-100): 共识程度，考虑是否达成或接近共识
5. keyInsights: 关键洞察和亮点
6. discussedTopics: 讨论涉及的主题
7. participantInsights: 每个参与者的分析
8. relationshipDynamics: 参与者之间的关系动态
9. recommendation: 基于分析的推荐

请严格按照JSON格式输出，不要包含任何解释。`;

    const userPrompt = `请分析以下圆桌讨论：

圆桌名称: ${round.name}
圆桌描述: ${round.description || '无'}

参与者 (${participants.length}人):
${participants.map((p, i) => `${i + 1}. ${p.name || '未知'} (${p.email})`).join('\n')}

讨论消息 (${messages.length}条):
${messages
  .map(
    (m, i) =>
      `[${i + 1}] ${m.content}${m.type !== 'text' ? ` (${m.type})` : ''}`
  )
  .join('\n')}

请生成分析结果。`;

    try {
      const result = await this.minimaxClient.chatJSON<MinimaxRoundAnalysisResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 4096,
        }
      );

      // 构建参与者洞察
      const participantInsights: ParticipantInsight[] = participants.map((p) => {
        const insight = result.participantInsights.find((i) => i.userId === p.id);
        return {
          userId: p.id,
          userName: p.name,
          contributionScore: insight?.contributionScore ?? 50,
          perspectiveType: insight?.perspectiveType ?? 'collaborative',
          keyPositions: insight?.keyPositions ?? [],
          alignmentWithOthers: insight?.alignmentWithOthers ?? 50,
        };
      });

      // 构建关系动态
      const relationshipDynamics: RelationshipDynamics = {
        consensusTopics: result.relationshipDynamics?.consensusTopics ?? [],
        conflictTopics: result.relationshipDynamics?.conflictTopics ?? [],
        collaborativePairs:
          result.relationshipDynamics?.collaborativePairs ?? [],
        opposingPairs: result.relationshipDynamics?.opposingPairs ?? [],
      };

      return {
        discussionQuality: Math.max(0, Math.min(100, result.discussionQuality ?? 50)),
        participationScore: Math.max(
          0,
          Math.min(100, result.participationScore ?? 50)
        ),
        topicAlignment: Math.max(0, Math.min(100, result.topicAlignment ?? 50)),
        consensusLevel: Math.max(0, Math.min(100, result.consensusLevel ?? 50)),
        keyInsights: result.keyInsights ?? [],
        discussedTopics: result.discussedTopics ?? [],
        participantInsights,
        relationshipDynamics,
        recommendation: result.recommendation ?? '建议继续观察',
      };
    } catch (error) {
      console.error('Minimax API 调用失败:', error);
      return this.getFallbackAnalysis(round.id);
    }
  }

  /**
   * 获取兜底分析结果
   */
  private getFallbackAnalysis(roundId: string): RoundAnalysisResult {
    return {
      roundId,
      discussionQuality: 50,
      participationScore: 50,
      topicAlignment: 50,
      consensusLevel: 50,
      keyInsights: [],
      discussedTopics: [],
      participantInsights: [],
      relationshipDynamics: {
        consensusTopics: [],
        conflictTopics: [],
        collaborativePairs: [],
        opposingPairs: [],
      },
      recommendation: '讨论数据不足，无法生成有意义的分析',
    };
  }
}

// ============================================
// 单例导出
// ============================================

let instance: RoundAnalyzer | null = null;

export function getRoundAnalyzer(): RoundAnalyzer {
  if (!instance) {
    instance = new RoundAnalyzer();
  }
  return instance;
}

export function resetRoundAnalyzer(): void {
  instance = null;
}
