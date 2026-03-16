/**
 * [INPUT]: 依赖 lib/supabase/client 的 SupabaseClient
 * [OUTPUT]: 对外提供争鸣层对练引擎
 * [POS]: lib/zhengming/debate-engine.ts - 争鸣层对练引擎
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { Database } from '@/lib/supabase/types';
import type { Match, User } from '@/types';

export interface DebateEngineConfig {
  minQuestions: number;
  maxQuestions: number;
  analysisThreshold: number;
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

export class DebateEngine {
  private config: DebateEngineConfig;

  constructor(config: Partial<DebateEngineConfig> = {}) {
    this.config = {
      minQuestions: 3,
      maxQuestions: 5,
      analysisThreshold: 70,
      ...config,
    };
  }

  /**
   * 发起争鸣层对练
   * @param match - 知遇卡信息
   * @returns 争鸣层对练结果
   */
  async initiateDebate(match: Match): Promise<DebateResult> {
    // 生成问题
    const questions = await this.generateQuestions(match);

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
    // 实际实现中应该保存到数据库
    // 这里记录响应
    const responseData: DebateResponse = {
      questionId,
      userAId: userId,
      userBId: '', // 由实际逻辑填充
      userAResponse: response,
      userBResponse: '', // 等待对方回答
      timestamp: new Date().toISOString(),
    };

    // TODO: 保存到数据库
    console.log('Response submitted:', responseData);
  }

  /**
   * 完成争鸣层并生成分析报告
   * @param debateId - 对练ID
   * @returns 完整的分析报告
   */
  async completeDebate(debateId: string): Promise<DebateResult> {
    // 获取所有回答
    const responses = await this.getDebateResponses(debateId);

    // 分析回答内容
    const analysis = await this.analyzeResponses(responses);

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
      questions: [], // 由实际逻辑填充
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
   * 生成争鸣层问题
   * @param match - 知遇卡信息
   * @returns 问题列表
   */
  private async generateQuestions(match: Match): Promise<DebateQuestion[]> {
    // 根据匹配关系类型生成相应问题
    const questions: DebateQuestion[] = [
      {
        id: `q1-${match.id}`,
        question: '如果你们要一起做一个项目，遇到意见分歧时，你会怎么处理？',
        type: 'conflict',
        context: '测试冲突处理能力',
      },
      {
        id: `q2-${match.id}`,
        question: '描述一个你过去做过的最冒险的决定，结果如何？',
        type: 'scenario',
        context: '了解风险偏好',
      },
      {
        id: `q3-${match.id}`,
        question: '在资源有限的情况下，你会优先考虑产品质量还是上线速度？',
        type: 'decision',
        context: '测试决策风格',
      },
    ];

    return questions;
  }

  /**
   * 获取争鸣层回答
   * @param debateId - 对练ID
   * @returns 回答列表
   */
  private async getDebateResponses(debateId: string): Promise<DebateResponse[]> {
    // 实际实现中从数据库查询
    return [];
  }

  /**
   * 分析回答内容
   * @param responses - 回答列表
   * @returns 分析结果
   */
  private async analyzeResponses(
    responses: DebateResponse[]
  ): Promise<DebateAnalysis> {
    // 实际实现中应该使用 AI 进行分析
    // 这里返回模拟数据
    return {
      concessionAbility: 75,
      boundaryAwareness: 80,
      riskAppetite: 65,
      decisionStyle: {
        userA: 'analytical',
        userB: 'intuitive',
      },
      disagreementType: ['approach', 'priority'],
      healthScore: 78,
    };
  }

  /**
   * 生成关系建议
   * @param analysis - 分析结果
   * @returns 建议文本
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
   * @param analysis - 分析结果
   * @returns 风险列表
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
   * @param analysis - 分析结果
   * @param shouldConnect - 是否应该继续联系
   * @returns 建议列表
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
