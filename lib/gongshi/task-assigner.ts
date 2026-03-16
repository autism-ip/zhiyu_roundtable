/**
 * [INPUT]: 依赖 lib/supabase/client 的 SupabaseClient，依赖 lib/ai/minimax-client
 * [OUTPUT]: 对外提供共试层任务分配器
 * [POS]: lib/gongshi/task-assigner.ts - 共试层任务分配
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getMinimaxClient, MinimaxClient } from '@/lib/ai/minimax-client';
import type { Database } from '@/lib/supabase/types';
import type { Debate, User } from '@/types';

export interface TaskAssignerConfig {
  defaultTaskDuration: number; // 天数
  minTaskComplexity: number;
  maxTaskComplexity: number;
  minimaxModel?: string;
}

export interface CoTrialTask {
  id: string;
  debateId: string;
  taskType: 'co_write' | 'co_demo' | 'co_answer' | 'co_proposal' | 'co_collaboration';
  taskDescription: string;
  taskGoal: string;
  taskDuration: string;
  complexity: number;
  estimatedHours: number;
  deliverables: string[];
  successCriteria: string[];
  resources: string[];
  createdAt: string;
}

export interface TaskRecommendation {
  task: CoTrialTask;
  rationale: string;
  fitScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
}

/**
 * Minimax 返回的任务生成结果
 */
interface MinimaxTaskResult {
  taskType: CoTrialTask['taskType'];
  taskDescription: string;
  taskGoal: string;
  complexity: number;
  estimatedHours: number;
  deliverables: string[];
  successCriteria: string[];
}

export class TaskAssigner {
  private config: TaskAssignerConfig;
  private minimaxClient: MinimaxClient;

  constructor(config: Partial<TaskAssignerConfig> = {}) {
    this.config = {
      defaultTaskDuration: 7, // 7天
      minTaskComplexity: 1,
      maxTaskComplexity: 5,
      minimaxModel: 'abab6.5s-chat',
      ...config,
    };
    this.minimaxClient = getMinimaxClient();
  }

  /**
   * 根据争鸣层结果分配共试任务
   * @param debate - 争鸣层结果
   * @param userA - 用户A
   * @param userB - 用户B
   * @returns 任务推荐
   */
  async assignTask(
    debate: Debate,
    userA: User,
    userB: User
  ): Promise<TaskRecommendation> {
    // 优先尝试使用 Minimax 生成个性化任务
    try {
      const aiResult = await this.generateTaskWithAI(debate, userA, userB);

      if (aiResult) {
        // 计算适配度评分
        const fitScore = this.calculateFitScoreFromAI(aiResult, debate, userA, userB);

        // 确定风险等级
        const riskLevel = this.assessRiskLevelFromAI(aiResult, debate);

        // 生成任务对象
        const task: CoTrialTask = {
          id: `task-${Date.now()}`,
          debateId: debate.id,
          taskType: aiResult.taskType,
          taskDescription: aiResult.taskDescription,
          taskGoal: aiResult.taskGoal,
          taskDuration: `${this.config.defaultTaskDuration}天`,
          complexity: aiResult.complexity,
          estimatedHours: aiResult.estimatedHours,
          deliverables: aiResult.deliverables,
          successCriteria: aiResult.successCriteria,
          resources: this.generateResources(aiResult.taskType),
          createdAt: new Date().toISOString(),
        };

        return {
          task,
          rationale: this.generateRationaleFromAI(task, debate, fitScore),
          fitScore,
          riskLevel,
          prerequisites: this.identifyPrerequisites(task),
        };
      }
    } catch (error) {
      console.error('Minimax API 调用失败，使用规则引擎:', error);
    }

    // 兜底：使用规则引擎
    return this.assignTaskWithRules(debate, userA, userB);
  }

  /**
   * 使用 Minimax AI 生成个性化任务
   */
  private async generateTaskWithAI(
    debate: Debate,
    userA: User,
    userB: User
  ): Promise<MinimaxTaskResult | null> {
    const systemPrompt = `你是共试层的任务生成专家。你的任务是根据争鸣层分析结果和用户背景，生成个性化的协作任务建议。

任务类型：
1. co_write - 协作写作：共同撰写文章、文档
2. co_demo - 协作演示：制作Demo、视频或原型
3. co_answer - 协作问答：共同回答一个问题
4. co_proposal - 协作提案：撰写合作提案
5. co_collaboration - 深度协作：完整项目合作

请根据以下信息生成任务：
- 任务必须符合双方的背景和能力
- 任务复杂度要匹配争鸣层的健康度评分
- 任务目标要具体可衡量

请严格按照JSON格式输出：
{
  "taskType": "co_write|co_demo|co_answer|co_proposal|co_collaboration",
  "taskDescription": "任务描述（包含用户名字）",
  "taskGoal": "任务目标",
  "complexity": 1-5,
  "estimatedHours": 预估小时数,
  "deliverables": ["交付物1", "交付物2"],
  "successCriteria": ["成功标准1", "成功标准2"]
}`;

    const userPrompt = `请为以下用户生成共试任务：

用户A：
- 名字：${userA.name || '未知'}
- 专业背景：${userA.interests?.join(', ') || '未知'}

用户B：
- 名字：${userB.name || '未知'}
- 专业背景：${userB.interests?.join(', ') || '未知'}

争鸣层分析结果：
- 健康度评分：${debate.analysis?.healthScore || 60}
- 让步能力：${debate.analysis?.concessionAbility || 60}
- 风险偏好：${debate.analysis?.riskAppetite || 50}
- 用户A决策风格：${debate.analysis?.decisionStyle?.userA || 'analytical'}
- 用户B决策风格：${debate.analysis?.decisionStyle?.userB || 'analytical'}
- 关系建议：${debate.relationshipSuggestion || '同道'}
- 识别出的风险：${(debate.riskAreas || []).join(', ') || '无'}`;

    try {
      const result = await this.minimaxClient.chatJSON<MinimaxTaskResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.5,
          maxTokens: 2048,
        }
      );

      // 验证结果
      return {
        taskType: this.validateTaskType(result.taskType),
        taskDescription: result.taskDescription || '',
        taskGoal: result.taskGoal || '',
        complexity: Math.max(1, Math.min(5, result.complexity || 3)),
        estimatedHours: result.estimatedHours || 8,
        deliverables: result.deliverables || [],
        successCriteria: result.successCriteria || [],
      };
    } catch (error) {
      console.error('Minimax 任务生成失败:', error);
      return null;
    }
  }

  /**
   * 验证任务类型
   */
  private validateTaskType(type: string): CoTrialTask['taskType'] {
    const validTypes: CoTrialTask['taskType'][] = [
      'co_write', 'co_demo', 'co_answer', 'co_proposal', 'co_collaboration'
    ];
    return validTypes.includes(type as any) ? type as CoTrialTask['taskType'] : 'co_collaboration';
  }

  /**
   * 根据 AI 结果计算适配度
   */
  private calculateFitScoreFromAI(
    task: MinimaxTaskResult,
    debate: Debate,
    userA: User,
    userB: User
  ): number {
    let score = 70; // 基础分

    // 根据健康度调整
    const healthScore = debate.analysis?.healthScore || 60;
    score += (healthScore - 60) * 0.3;

    // 根据复杂度匹配
    if (task.complexity <= 2) {
      score += 10;
    } else if (task.complexity >= 4) {
      score -= 10;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * 根据 AI 结果评估风险
   */
  private assessRiskLevelFromAI(task: MinimaxTaskResult, debate: Debate): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // 复杂度风险
    riskScore += task.complexity * 15;

    // 健康度风险
    const healthScore = debate.analysis?.healthScore || 60;
    riskScore += (100 - healthScore) * 0.4;

    if (riskScore < 35) return 'low';
    if (riskScore < 65) return 'medium';
    return 'high';
  }

  /**
   * 生成 AI 版本的推荐理由
   */
  private generateRationaleFromAI(
    task: CoTrialTask,
    debate: Debate,
    fitScore: number
  ): string {
    const healthScore = debate.analysis?.healthScore || 60;

    let rationale = `基于争鸣层的分析结果（健康度 ${healthScore}），`;

    if (healthScore >= 80) {
      rationale += '你们展现了出色的协作潜力，这个任务将帮助验证你们的实际协作能力。';
    } else if (healthScore >= 60) {
      rationale += '你们有一定的合作基础，这个任务可以帮助进一步验证。';
    } else {
      rationale += '建议从轻量级任务开始，逐步建立协作信任。';
    }

    if (fitScore >= 80) {
      rationale += `\n\n系统评估任务匹配度：${fitScore}%，非常适合你们！`;
    }

    return rationale;
  }

  /**
   * 规则引擎兜底方案
   */
  private async assignTaskWithRules(
    debate: Debate,
    userA: User,
    userB: User
  ): Promise<TaskRecommendation> {
    // 根据争鸣层分析结果选择合适的任务类型
    const taskType = this.determineTaskType(debate);

    // 根据用户特征和关系类型定制任务
    const taskDescription = this.generateTaskDescription(
      taskType,
      debate,
      userA,
      userB
    );

    // 设置任务目标
    const taskGoal = this.generateTaskGoal(taskType, debate);

    // 计算复杂度
    const complexity = this.calculateComplexity(debate, taskType);

    // 估算所需时间
    const estimatedHours = this.estimateHours(complexity, taskType);

    // 生成任务
    const task: CoTrialTask = {
      id: `task-${Date.now()}`,
      debateId: debate.id,
      taskType,
      taskDescription,
      taskGoal,
      taskDuration: `${this.config.defaultTaskDuration}天`,
      complexity,
      estimatedHours,
      deliverables: this.generateDeliverables(taskType),
      successCriteria: this.generateSuccessCriteria(taskType, debate),
      resources: this.generateResources(taskType),
      createdAt: new Date().toISOString(),
    };

    // 计算适配度评分
    const fitScore = this.calculateFitScore(task, debate, userA, userB);

    // 确定风险等级
    const riskLevel = this.assessRiskLevel(task, debate);

    // 生成推荐理由
    const rationale = this.generateRationale(task, debate, fitScore);

    // 确定前置条件
    const prerequisites = this.identifyPrerequisites(task);

    return {
      task,
      rationale,
      fitScore,
      riskLevel,
      prerequisites,
    };
  }

  /**
   * 确定任务类型
   */
  private determineTaskType(debate: Debate): CoTrialTask['taskType'] {
    const analysis = debate.analysis;

    // 根据争鸣层分析结果选择最适合的任务类型
    if (analysis.healthScore >= 80) {
      // 高健康度 - 可以承担更复杂的协作
      return 'co_collaboration';
    } else if (analysis.concessionAbility >= 70) {
      // 让步能力好 - 适合需要讨论的任务
      return 'co_write';
    } else if (analysis.riskAppetite >= 70) {
      // 风险偏好高 - 可以尝试创新任务
      return 'co_demo';
    } else {
      // 保守选择 - 从简单任务开始
      return 'co_answer';
    }
  }

  /**
   * 生成任务描述
   */
  private generateTaskDescription(
    taskType: CoTrialTask['taskType'],
    debate: Debate,
    userA: User,
    userB: User
  ): string {
    const descriptions: Record<CoTrialTask['taskType'], string> = {
      co_write: `共同撰写一篇关于"${debate.scenario || '你们讨论的话题'}"的文章。${userA.name}负责前半部分的观点阐述，${userB.name}负责后半部分的总结和升华。`,
      co_demo: `合作制作一个展示"${debate.scenario || '你们的想法'}"的演示Demo。可以是PPT、视频或原型，展示你们如何协作解决问题。`,
      co_answer: `共同回答一个知乎上的相关问题:"${debate.scenario || '与你们讨论相关的热门问题'}"，展示你们的多角度思考。`,
      co_proposal: `合作撰写一份关于"${debate.scenario || '你们的项目构想'}"的合作提案，明确分工、目标和时间规划。`,
      co_collaboration: `开展一个为期${this.config.defaultTaskDuration}天的深度协作项目，主题围绕"${debate.scenario || '共同感兴趣的领域'}"，产出可交付的成果。`,
    };

    return descriptions[taskType];
  }

  /**
   * 生成任务目标
   */
  private generateTaskGoal(
    taskType: CoTrialTask['taskType'],
    debate: Debate
  ): string {
    const goals: Record<CoTrialTask['taskType'], string> = {
      co_write: '通过协作写作，验证双方在观点表达、逻辑梳理和文风统一上的协作能力。',
      co_demo: '通过制作Demo，验证双方在创意实现、分工协作和成果交付上的执行力。',
      co_answer: '通过共同回答，验证双方在知识互补、观点整合和公共表达上的配合度。',
      co_proposal: '通过撰写提案，验证双方在战略规划、资源分配和长期合作上的共识度。',
      co_collaboration: '通过深度协作项目，全面验证双方在真实工作场景中的协作契合度。',
    };

    return goals[taskType];
  }

  /**
   * 计算任务复杂度
   */
  private calculateComplexity(
    debate: Debate,
    taskType: CoTrialTask['taskType']
  ): number {
    const baseComplexity: Record<CoTrialTask['taskType'], number> = {
      co_write: 2,
      co_demo: 3,
      co_answer: 1,
      co_proposal: 4,
      co_collaboration: 5,
    };

    let complexity = baseComplexity[taskType];

    // 根据争鸣层分析结果调整复杂度
    const analysis = debate.analysis;

    if (analysis.healthScore < 60) {
      // 健康度低，降低复杂度
      complexity = Math.max(1, complexity - 1);
    } else if (analysis.healthScore > 80) {
      // 健康度高，可以适当增加复杂度
      complexity = Math.min(5, complexity + 0.5);
    }

    // 根据决策风格匹配度调整
    if (analysis.decisionStyle.userA !== analysis.decisionStyle.userB) {
      // 决策风格不同，增加复杂度
      complexity += 0.5;
    }

    return Math.round(complexity);
  }

  /**
   * 估算所需时间
   */
  private estimateHours(complexity: number, taskType: CoTrialTask['taskType']): number {
    const baseHours: Record<CoTrialTask['taskType'], number> = {
      co_write: 4,
      co_demo: 8,
      co_answer: 2,
      co_proposal: 10,
      co_collaboration: 20,
    };

    const base = baseHours[taskType];
    const multiplier = 1 + (complexity - 1) * 0.2; // 每增加1级复杂度，增加20%时间

    return Math.round(base * multiplier);
  }

  /**
   * 生成交付物清单
   */
  private generateDeliverables(taskType: CoTrialTask['taskType']): string[] {
    const deliverables: Record<CoTrialTask['taskType'], string[]> = {
      co_write: ['文章初稿', '修改版本', '最终发布版本'],
      co_demo: ['演示PPT/视频', '原型文件', '演示脚本'],
      co_answer: ['答案草稿', '最终回答', '互动回复'],
      co_proposal: ['提案文档', '执行计划', '时间表'],
      co_collaboration: ['周进度报告', '最终成果', '复盘总结'],
    };

    return deliverables[taskType];
  }

  /**
   * 生成成功标准
   */
  private generateSuccessCriteria(
    taskType: CoTrialTask['taskType'],
    debate: Debate
  ): string[] {
    const baseCriteria = [
      '按时完成所有交付物',
      '双方对最终成果满意',
      '协作过程中沟通顺畅',
    ];

    const specificCriteria: Record<CoTrialTask['taskType'], string[]> = {
      co_write: ['文章观点清晰，逻辑连贯', '双方文风统一'],
      co_demo: ['演示流畅，技术实现完整', '双方对展示内容认同'],
      co_answer: ['答案获得社区认可', '观点有深度和独特性'],
      co_proposal: ['提案可行性强', '双方对分工和责任认同'],
      co_collaboration: ['项目目标达成', '双方协作默契度提升'],
    };

    return [...baseCriteria, ...specificCriteria[taskType]];
  }

  /**
   * 生成资源列表
   */
  private generateResources(taskType: CoTrialTask['taskType']): string[] {
    const resources: Record<CoTrialTask['taskType'], string[]> = {
      co_write: ['协作写作工具（如Google Docs）', '参考资料库', '写作指南'],
      co_demo: ['演示软件（如Keynote/PPT）', '原型工具', '录屏软件'],
      co_answer: ['知乎平台账号', '相关领域知识库', '问答社区规范'],
      co_proposal: ['项目管理工具', '模板库', '预算计算工具'],
      co_collaboration: ['项目管理软件', '沟通工具（如Slack/飞书）', '文档协作平台'],
    };

    return resources[taskType];
  }

  /**
   * 计算适配度评分
   */
  private calculateFitScore(
    task: CoTrialTask,
    debate: Debate,
    userA: User,
    userB: User
  ): number {
    let score = 70; // 基础分

    // 根据任务类型和关系类型匹配度调整
    const taskTypeToRelation: Record<CoTrialTask['taskType'], string[]> = {
      co_write: ['peer', 'cofounder'],
      co_demo: ['cofounder', 'opponent'],
      co_answer: ['peer', 'advisor'],
      co_proposal: ['cofounder'],
      co_collaboration: ['cofounder', 'peer'],
    };

    if (taskTypeToRelation[task.taskType].includes(debate.relationshipSuggestion)) {
      score += 15;
    }

    // 根据健康度调整
    score += (debate.analysis.healthScore - 70) * 0.2;

    // 根据复杂度匹配用户能力（简化处理）
    if (task.complexity <= 2) {
      score += 5; // 简单任务适配度高
    } else if (task.complexity >= 4) {
      score -= 5; // 复杂任务需要更多考量
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * 评估风险等级
   */
  private assessRiskLevel(task: CoTrialTask, debate: Debate): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // 复杂度风险
    riskScore += task.complexity * 10;

    // 健康度风险（反向）
    riskScore += (100 - debate.analysis.healthScore) * 0.3;

    // 风险承受能力风险
    if (debate.analysis.riskAppetite < 40) {
      riskScore += 15;
    }

    // 让步能力风险
    if (debate.analysis.concessionAbility < 60) {
      riskScore += 10;
    }

    // 根据分数确定风险等级
    if (riskScore < 40) {
      return 'low';
    } else if (riskScore < 70) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * 生成推荐理由
   */
  private generateRationale(
    task: CoTrialTask,
    debate: Debate,
    fitScore: number
  ): string {
    const rationales: string[] = [];

    // 基础推荐理由
    rationales.push(`基于你们在争鸣层的表现，${task.taskDescription}是检验你们实际协作能力的最佳方式。`);

    // 根据关系类型
    if (debate.relationshipSuggestion === 'cofounder') {
      rationales.push('考虑到你们被识别为潜在的共创搭子，这个任务能有效验证你们在真实项目中的协作模式。');
    } else if (debate.relationshipSuggestion === 'peer') {
      rationales.push('作为潜在的同道，这个任务能帮助你们验证在知识分享和思想碰撞上的契合度。');
    }

    // 根据健康度
    if (debate.analysis.healthScore >= 80) {
      rationales.push('你们在争鸣层展现了很高的协作健康度，有信心能够顺利完成任务。');
    } else {
      rationales.push('这个任务也是一个很好的机会，帮助你们在实践中改善协作中的薄弱环节。');
    }

    // 根据复杂度
    if (task.complexity <= 2) {
      rationales.push('任务难度适中，不会占用过多时间，适合作为初次协作的试水。');
    } else if (task.complexity >= 4) {
      rationales.push('这是一个较有挑战性的任务，能够全面检验你们的协作能力。');
    }

    // 适配度评分
    if (fitScore >= 80) {
      rationales.push(`系统评估显示这个任务与你们的匹配度高达${fitScore}%，非常适合！`);
    } else if (fitScore >= 60) {
      rationales.push(`任务匹配度为${fitScore}%，是一个合理的选择。`);
    }

    return rationales.join('\n\n');
  }

  /**
   * 识别前置条件
   */
  private identifyPrerequisites(task: CoTrialTask): string[] {
    const prerequisites: string[] = [];

    // 基础前置条件
    prerequisites.push('双方确认接受共试任务');
    prerequisites.push('明确任务目标和时间规划');

    // 根据任务类型
    switch (task.taskType) {
      case 'co_write':
        prerequisites.push('确定协作写作平台');
        prerequisites.push('商定文章大纲和分工');
        break;
      case 'co_demo':
        prerequisites.push('准备演示所需的工具和环境');
        prerequisites.push('确定演示的主题和范围');
        break;
      case 'co_answer':
        prerequisites.push('选定要回答的知乎问题');
        prerequisites.push('研究问题背景和已有回答');
        break;
      case 'co_proposal':
        prerequisites.push('收集必要的背景信息');
        prerequisites.push('确定提案的核心目标');
        break;
      case 'co_collaboration':
        prerequisites.push('建立有效的沟通渠道');
        prerequisites.push('制定详细的项目计划');
        prerequisites.push('明确双方的角色和职责');
        break;
    }

    // 根据复杂度
    if (task.complexity >= 4) {
      prerequisites.push('安排定期的进度检查会议');
      prerequisites.push('建立问题升级机制');
    }

    return prerequisites;
  }
}

// 导出单例实例
export const taskAssigner = new TaskAssigner();
