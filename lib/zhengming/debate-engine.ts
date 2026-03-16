/**
 * [INPUT]: 依赖 lib/supabase/client 的 SupabaseClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供争鸣层对练引擎
 * [POS]: lib/zhengming/debate-engine.ts - 争鸣层对练引擎
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { Database } from '@/lib/supabase/types';
import type { Match, User } from '@/types';

export interface DebateEngineConfig {
  minQuestions: number;
  maxQuestions: number;
  analysisThreshold: number;
  minimaxModel?: string;
}

export interface DebateQuestion {
  id: string;
  question: string;
  type: 'scenario' | 'conflict' | 'decision';
  context: string;
}

export interface DebateResponse {
  questionId: string;
  userAId: string;
  userBId: string;
  userAResponse: string;
  userBResponse: string;
  timestamp: string;
}

export interface DebateAnalysis {
  concessionAbility: number;
  boundaryAwareness: number;
  riskAppetite: number;
  decisionStyle: {
    userA: string;
    userB: string;
  };
  disagreementType: string[];
  healthScore: number;
}

export interface DebateResult {
  matchId: string;
  questions: DebateQuestion[];
  responses: DebateResponse[];
  analysis: DebateAnalysis;
  relationshipSuggestion: string;
  shouldConnect: boolean;
  riskAreas: string[];
  nextSteps: string[];
}

/**
 * Minimax 返回的问题生成结果
 */
interface MinimaxQuestionResult {
  questions: DebateQuestion[];
}

/**
 * Minimax 返回的分析结果
 */
interface MinimaxAnalysisResult {
  concessionAbility: number;
  boundaryAwareness: number;
  riskAppetite: number;
  decisionStyle: {
    userA: string;
    userB: string;
  };
  disagreementType: string[];
  healthScore: number;
}

export class DebateEngine {
  private config: DebateEngineConfig;
  private minimaxClient: MinimaxClient;

  constructor(config: Partial<DebateEngineConfig> = {}) {
    this.config = {
      minQuestions: 3,
      maxQuestions: 5,
      analysisThreshold: 70,
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
  }

  /**
   * 发起争鸣层对练
   * @param match - 知遇卡信息
   * @returns 争鸣层对练结果
   */
  async initiateDebate(match: Match): Promise<DebateResult> {
    // 使用 Minimax 生成问题
    const questions = await this.generateQuestionsWithAI(match);

    // 初始化结果对象
    const result: DebateResult = {
      matchId: match.id,
      questions,
      responses: [],
      analysis: null as any,
      relationshipSuggestion: '',
      shouldConnect: false,
      riskAreas: [],
      nextSteps: [],
    };

    return result;
  }

  /**
   * 提交回答
   * @param debateId - 对练ID
   * @param questionId - 问题ID
   * @param userId - 用户ID
   * @param response - 回答内容
   */
  async submitResponse(
    debateId: string,
    questionId: string,
    userId: string,
    response: string
  ): Promise<void> {
    // TODO: 保存到数据库
    // await prisma.debateResponse.create({...})
    console.log('Response submitted:', { debateId, questionId, userId, response });
  }

  /**
   * 完成争鸣层并生成分析报告
   * @param debateId - 对练ID
   * @returns 完整的分析报告
   */
  async completeDebate(debateId: string): Promise<DebateResult> {
    // 获取所有回答
    const responses = await this.getDebateResponses(debateId);

    // 使用 Minimax 分析回答内容
    const analysis = await this.analyzeResponsesWithAI(responses);

    // 生成建议
    const suggestion = this.generateRelationshipSuggestion(analysis);

    // 判断是否应该继续联系
    const shouldConnect = analysis.healthScore >= this.config.analysisThreshold;

    // 识别风险领域
    const riskAreas = this.identifyRiskAreas(analysis);

    // 生成下一步建议
    const nextSteps = this.generateNextSteps(analysis, shouldConnect);

    const result: DebateResult = {
      matchId: debateId,
      questions: [],
      responses,
      analysis,
      relationshipSuggestion: suggestion,
      shouldConnect,
      riskAreas,
      nextSteps,
    };

    return result;
  }

  /**
   * 使用 Minimax AI 生成争鸣层问题
   */
  private async generateQuestionsWithAI(match: Match): Promise<DebateQuestion[]> {
    const systemPrompt = `你是争鸣层的问题生成专家。你的任务是根据知遇卡信息，生成用于验证双方合作可行性的结构化问题。

问题类型：
1. conflict - 冲突处理类问题：测试用户如何处理意见分歧
2. scenario - 场景模拟类问题：了解用户在过去类似场景中的表现
3. decision - 决策风格类问题：测试用户的决策方式和优先级

请生成 ${this.config.minQuestions} 个问题，确保：
- 问题与匹配的关系类型相关
- 能够有效识别潜在的风险领域
- 避免过于私人或敏感的问题

请严格按照JSON格式输出，格式如下：
{
  "questions": [
    {"id": "q1", "question": "...", "type": "conflict|scenario|decision", "context": "..."}
  ]
}`;

    const userPrompt = `请为以下知遇卡生成争鸣层问题：

关系类型：${match.relationshipType}
匹配原因：${match.matchReason}
互补领域：${(match.complementarityAreas || []).join(', ')}
用户A的优势：${match.complementarityAreas?.[0] || '未知'}
用户B的优势：${match.complementarityAreas?.[1] || '未知'}`;

    try {
      const result = await this.minimaxClient.chatJSON<MinimaxQuestionResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.5,
          maxTokens: 2048,
        }
      );

      return result.questions || [];
    } catch (error) {
      console.error('Minimax API 调用失败:', error);
      // 返回兜底问题
      return this.getFallbackQuestions(match.id);
    }
  }

  /**
   * 使用 Minimax AI 分析回答
   */
  private async analyzeResponsesWithAI(
    responses: DebateResponse[]
  ): Promise<DebateAnalysis> {
    if (responses.length === 0) {
      return this.getFallbackAnalysis();
    }

    const systemPrompt = `你是争鸣层的分析专家。你的任务是分析双方在争鸣层对练中的回答，评估他们的合作可行性。

分析维度：
1. 让步能力 (0-100)：用户是否能够在冲突中做出合理让步
2. 边界意识 (0-100)：用户是否有清晰的个人边界和原则
3. 风险偏好 (0-100)：用户对风险的容忍程度
4. 决策风格：intuitive(直觉型), analytical(分析型), collaborative(协作型), directive(指令型)
5. 分歧类型：values(价值观), methods(方法论), goals(目标), risk_tolerance(风险承受力)
6. 健康度评分 (0-100)：综合评估双方的合作可行性

请严格按照JSON格式输出，不要包含任何解释。`;

    const userPrompt = `请分析以下争鸣层回答：

${responses.map(r => `
问题 ${r.questionId}:
用户A的回答: ${r.userAResponse}
用户B的回答: ${r.userBResponse}
`).join('\n')}

请生成分析结果。`;

    try {
      const result = await this.minimaxClient.chatJSON<MinimaxAnalysisResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 2048,
        }
      );

      // 验证并规范化结果
      return {
        concessionAbility: Math.max(0, Math.min(100, result.concessionAbility || 0)),
        boundaryAwareness: Math.max(0, Math.min(100, result.boundaryAwareness || 0)),
        riskAppetite: Math.max(0, Math.min(100, result.riskAppetite || 0)),
        decisionStyle: {
          userA: this.validateDecisionStyle(result.decisionStyle?.userA),
          userB: this.validateDecisionStyle(result.decisionStyle?.userB),
        },
        disagreementType: result.disagreementType || [],
        healthScore: Math.max(0, Math.min(100, result.healthScore || 0)),
      };
    } catch (error) {
      console.error('Minimax API 调用失败:', error);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * 验证决策风格
   */
  private validateDecisionStyle(style: string): string {
    const validStyles = ['intuitive', 'analytical', 'collaborative', 'directive'];
    return validStyles.includes(style) ? style : 'analytical';
  }

  /**
   * 获取兜底问题
   */
  private getFallbackQuestions(matchId: string): DebateQuestion[] {
    return [
      {
        id: `q1-${matchId}`,
        question: '如果你们要一起做一个项目，遇到意见分歧时，你会怎么处理？',
        type: 'conflict',
        context: '测试冲突处理能力',
      },
      {
        id: `q2-${matchId}`,
        question: '描述一个你过去做过的最冒险的决定，结果如何？',
        type: 'scenario',
        context: '了解风险偏好',
      },
      {
        id: `q3-${matchId}`,
        question: '在资源有限的情况下，你会优先考虑产品质量还是上线速度？',
        type: 'decision',
        context: '测试决策风格',
      },
    ];
  }

  /**
   * 获取兜底分析结果
   */
  private getFallbackAnalysis(): DebateAnalysis {
    return {
      concessionAbility: 60,
      boundaryAwareness: 60,
      riskAppetite: 50,
      decisionStyle: {
        userA: 'analytical',
        userB: 'analytical',
      },
      disagreementType: [],
      healthScore: 60,
    };
  }

  /**
   * 获取争鸣层回答（从数据库）
   */
  private async getDebateResponses(debateId: string): Promise<DebateResponse[]> {
    // TODO: 从 Prisma/Supabase 查询
    // const responses = await prisma.debateResponse.findMany({...})
    return [];
  }

  /**
   * 生成关系建议
   */
  private generateRelationshipSuggestion(analysis: DebateAnalysis): string {
    if (analysis.healthScore >= 80) {
      return '建议成为共创搭子 - 你们在决策风格和沟通方式上有很好的互补性';
    } else if (analysis.healthScore >= 60) {
      return '建议先成为同道 - 有合作潜力，但需要更多时间磨合';
    } else {
      return '建议保持弱连接 - 在某些方面存在较大分歧，需要谨慎评估';
    }
  }

  /**
   * 识别风险领域
   */
  private identifyRiskAreas(analysis: DebateAnalysis): string[] {
    const risks: string[] = [];

    if (analysis.concessionAbility < 70) {
      risks.push('让步能力 - 双方都倾向于坚持己见');
    }

    if (analysis.riskAppetite > 80) {
      risks.push('风险偏好 - 可能过于冒险');
    } else if (analysis.riskAppetite < 40) {
      risks.push('风险偏好 - 可能过于保守');
    }

    if (analysis.decisionStyle.userA !== analysis.decisionStyle.userB) {
      risks.push('决策风格 - 不同的决策方式可能导致摩擦');
    }

    return risks;
  }

  /**
   * 生成下一步建议
   */
  private generateNextSteps(
    analysis: DebateAnalysis,
    shouldConnect: boolean
  ): string[] {
    if (!shouldConnect) {
      return [
        '建议先保持弱连接，观察对方在其他场景的表现',
        '可以参与相同的圆桌讨论，但暂不进入共试层',
      ];
    }

    const steps: string[] = [
      '进入共试层，选择一个轻量级的协作任务',
      '设定明确的协作目标和评估标准',
    ];

    if (analysis.concessionAbility < 70) {
      steps.push('特别注意建立有效的冲突解决机制');
    }

    steps.push('在共试过程中定期回顾和调整协作方式');

    return steps;
  }
}

// 导出单例实例
export const debateEngine = new DebateEngine();
