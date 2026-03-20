/**
 * [INPUT]: 依赖 @/lib/supabase/client 的 supabaseAdmin，依赖 @/lib/ai/minimax-client 的 getMinimaxClient
 * [OUTPUT]: 对外提供 QuestionGenerator 类和 getQuestionGenerator 函数
 * [POS]: src/lib/zhengming/question-generator.ts - 争鸣层问题生成器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, type MinimaxClient } from '@/lib/ai/minimax-client';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 问题类型
 */
export type QuestionType = 'scenario' | 'exploration' | 'challenge';

/**
 * 生成的问题
 */
export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  content: string;
  purpose: string;
  expectedDimensions: string[];
}

/**
 * 关系类型
 */
export type RelationshipType = 'cofounder' | 'peer' | 'opponent' | 'advisor' | 'mentee' | 'none';

/**
 * 匹配数据（来自数据库）
 */
interface MatchData {
  id: string;
  round_id: string;
  user_a_id: string;
  user_b_id: string;
  complementarity_score: number;
  future_generativity: number;
  overall_score: number;
  relationship_type: RelationshipType;
  match_reason: string;
  complementarity_areas: string[];
  insights: any[];
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * 用户数据（来自数据库）
 */
interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  secondme_id: string | null;
  interests: string[];
  connection_types: string[];
}

/**
 * AI 返回的问题结构
 */
interface AIQuestionResponse {
  questions: GeneratedQuestion[];
}

/**
 * QuestionGenerator 配置
 */
export interface QuestionGeneratorConfig {
  /** 每种关系类型生成的问题数量 */
  questionsPerType: number;
  /** MiniMax 模型 */
  minimaxModel: string;
}

// =============================================================================
// 默认配置
// =============================================================================

const DEFAULT_CONFIG: QuestionGeneratorConfig = {
  questionsPerType: 3,
  minimaxModel: 'abab6.5s-chat',
};

// =============================================================================
// 默认问题模板
// =============================================================================

const DEFAULT_QUESTIONS: Record<RelationshipType, GeneratedQuestion[]> = {
  cofounder: [
    {
      id: 'cofounder-q1',
      type: 'scenario',
      content: '你们的商业模式是什么？如何实现盈利？',
      purpose: '验证商业思维互补性',
      expectedDimensions: ['商业模式', '盈利路径', '市场定位'],
    },
    {
      id: 'cofounder-q2',
      type: 'exploration',
      content: '你们对成功的定义是什么？希望从中获得什么？',
      purpose: '探索价值观一致性',
      expectedDimensions: ['成功定义', '动机来源', '价值取向'],
    },
    {
      id: 'cofounder-q3',
      type: 'challenge',
      content: '当公司面临重大决策时，你们如何达成共识？',
      purpose: '评估决策模式兼容性',
      expectedDimensions: ['决策风格', '冲突解决', '信任基础'],
    },
  ],
  peer: [
    {
      id: 'peer-q1',
      type: 'scenario',
      content: '描述一个你们各自最引以为豪的项目经历',
      purpose: '了解对方的专业能力',
      expectedDimensions: ['专业深度', '成就动机', '项目复杂度'],
    },
    {
      id: 'peer-q2',
      type: 'exploration',
      content: '你们的长期职业目标是什么？如何规划实现路径？',
      purpose: '探索发展方向的兼容性',
      expectedDimensions: ['职业规划', '成长需求', '价值实现'],
    },
    {
      id: 'peer-q3',
      type: 'challenge',
      content: '你们如何看待竞争与合作的关系？',
      purpose: '评估竞争观一致性',
      expectedDimensions: ['竞争意识', '合作意愿', '边界认知'],
    },
  ],
  opponent: [
    {
      id: 'opponent-q1',
      type: 'scenario',
      content: '描述一个你们观点完全对立的场景',
      purpose: '理解冲突的本质',
      expectedDimensions: ['观点差异', '立场根源', '解决可能'],
    },
    {
      id: 'opponent-q2',
      type: 'exploration',
      content: '你们为什么会对同一问题产生不同看法？',
      purpose: '探索认知差异',
      expectedDimensions: ['思维方式', '经验背景', '价值取向'],
    },
    {
      id: 'opponent-q3',
      type: 'challenge',
      content: '在什么情况下你们愿意改变自己的观点？',
      purpose: '评估改变的可能性',
      expectedDimensions: ['开放程度', '说服机制', '底线思维'],
    },
  ],
  advisor: [
    {
      id: 'advisor-q1',
      type: 'scenario',
      content: '作为导师，你会给学员什么样的建议帮助其成长？',
      purpose: '验证指导风格',
      expectedDimensions: ['指导方式', '关注重点', '成长预期'],
    },
    {
      id: 'advisor-q2',
      type: 'exploration',
      content: '导师最看重学员的哪些特质？为什么？',
      purpose: '探索价值判断',
      expectedDimensions: ['价值标准', '选择倾向', '培养理念'],
    },
    {
      id: 'advisor-q3',
      type: 'challenge',
      content: '当学员不认同你的建议时，你会如何处理？',
      purpose: '评估沟通模式',
      expectedDimensions: ['沟通方式', '尊重边界', '调整能力'],
    },
  ],
  mentee: [
    {
      id: 'mentee-q1',
      type: 'scenario',
      content: '你希望从导师那里获得什么样的指导？',
      purpose: '明确学习需求',
      expectedDimensions: ['学习目标', '成长需求', '期望值'],
    },
    {
      id: 'mentee-q2',
      type: 'exploration',
      content: '你目前面临的最大挑战是什么？希望如何突破？',
      purpose: '探索发展瓶颈',
      expectedDimensions: ['问题识别', '解决思路', '资源需求'],
    },
    {
      id: 'mentee-q3',
      type: 'challenge',
      content: '当你不同意导师的观点时，你会如何表达？',
      purpose: '评估沟通能力',
      expectedDimensions: ['表达方式', '尊重程度', '独立思考'],
    },
  ],
  none: [
    {
      id: 'none-q1',
      type: 'exploration',
      content: '你希望通过与他人的连接获得什么？',
      purpose: '探索连接动机',
      expectedDimensions: ['需求识别', '价值认知', '期望管理'],
    },
    {
      id: 'none-q2',
      type: 'scenario',
      content: '描述你理想中的协作模式',
      purpose: '了解协作偏好',
      expectedDimensions: ['协作方式', '沟通风格', '角色定位'],
    },
    {
      id: 'none-q3',
      type: 'challenge',
      content: '你认为建立良好关系的关键是什么？',
      purpose: '评估关系认知',
      expectedDimensions: ['关系理解', '付出意愿', '边界把握'],
    },
  ],
};

// =============================================================================
// QuestionGenerator 类
// =============================================================================

/**
 * 问题生成器 - 根据匹配结果生成结构化问题
 *
 * 用于争鸣层，根据用户画像和匹配类型生成验证性问题，
 * 帮助双方在正式合作前了解彼此的价值观、能力和协作模式
 */
export class QuestionGenerator {
  private config: QuestionGeneratorConfig;
  private minimaxClient: MinimaxClient;
  private generatedQuestions: GeneratedQuestion[] = [];

  constructor(config: Partial<QuestionGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.minimaxClient = getMinimaxClient({ model: this.config.minimaxModel });
  }

  /**
   * 生成问题（主方法）
   * @param matchId 匹配 ID
   * @returns 生成的问题列表
   */
  async generateQuestions(matchId: string): Promise<GeneratedQuestion[]> {
    // 1. 获取匹配数据
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error('匹配不存在');
    }

    // 2. 获取用户数据
    const users = await this.getMatchUsers(match.user_a_id, match.user_b_id);
    if (users.length < 2) {
      throw new Error('用户数据不完整');
    }

    // 3. 调用 AI 生成问题
    try {
      const relationshipType = match.relationship_type as RelationshipType;
      const questions = await this.generateWithAI(match, users, relationshipType);
      this.generatedQuestions = questions;
      return questions;
    } catch (error) {
      console.error('AI 生成问题失败，使用默认问题:', error);
      // 4. AI 失败时返回默认问题
      this.generatedQuestions = this.getDefaultQuestions(match.relationship_type as RelationshipType);
      return this.generatedQuestions;
    }
  }

  /**
   * 生成情境模拟问题
   * @param matchId 匹配 ID
   * @returns 情境问题
   */
  async generateScenarioQuestion(matchId: string): Promise<GeneratedQuestion> {
    const questions = await this.generateQuestions(matchId);
    const scenarioQuestion = questions.find(q => q.type === 'scenario');

    if (scenarioQuestion) {
      return scenarioQuestion;
    }

    // 如果没有情境问题，生成一个
    return {
      id: `scenario-${Date.now()}`,
      type: 'scenario',
      content: '请描述一个你们理想中的合作场景',
      purpose: '探索合作可能性',
      expectedDimensions: ['协作模式', '角色分工', '预期成果'],
    };
  }

  /**
   * 生成开放探索问题
   * @param matchId 匹配 ID
   * @returns 探索问题
   */
  async generateExplorationQuestion(matchId: string): Promise<GeneratedQuestion> {
    const questions = await this.generateQuestions(matchId);
    const explorationQuestion = questions.find(q => q.type === 'exploration');

    if (explorationQuestion) {
      return explorationQuestion;
    }

    return {
      id: `exploration-${Date.now()}`,
      type: 'exploration',
      content: '你们对未来的期望是什么？',
      purpose: '探索价值观一致性',
      expectedDimensions: ['目标导向', '价值取向', '发展预期'],
    };
  }

  /**
   * 生成挑战性问题
   * @param matchId 匹配 ID
   * @returns 挑战问题
   */
  async generateChallengeQuestion(matchId: string): Promise<GeneratedQuestion> {
    const questions = await this.generateQuestions(matchId);
    const challengeQuestion = questions.find(q => q.type === 'challenge');

    if (challengeQuestion) {
      return challengeQuestion;
    }

    return {
      id: `challenge-${Date.now()}`,
      type: 'challenge',
      content: '你们最大的分歧会是什么？如何处理？',
      purpose: '评估冲突处理能力',
      expectedDimensions: ['分歧识别', '处理方式', '边界把握'],
    };
  }

  /**
   * 按类型获取问题
   * @param type 问题类型
   * @returns 指定类型的问题
   */
  getQuestionsByType(type: QuestionType): GeneratedQuestion[] {
    return this.generatedQuestions.filter(q => q.type === type);
  }

  /**
   * 获取默认问题
   * @param relationshipType 关系类型
   * @returns 默认问题列表
   */
  getDefaultQuestions(relationshipType: RelationshipType): GeneratedQuestion[] {
    return DEFAULT_QUESTIONS[relationshipType] || DEFAULT_QUESTIONS.none;
  }

  /**
   * 获取所有生成的问题
   * @returns 问题列表
   */
  getAllQuestions(): GeneratedQuestion[] {
    return this.generatedQuestions;
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 获取匹配数据
   */
  private async getMatch(matchId: string): Promise<MatchData | null> {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('获取匹配失败:', error);
      return null;
    }

    return data as MatchData;
  }

  /**
   * 获取匹配的用户数据
   */
  private async getMatchUsers(userAId: string, userBId: string): Promise<UserData[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('id', [userAId, userBId]);

    if (error) {
      console.error('获取用户失败:', error);
      return [];
    }

    return data as UserData[];
  }

  /**
   * 使用 AI 生成问题
   */
  private async generateWithAI(
    match: MatchData,
    users: UserData[],
    relationshipType: RelationshipType
  ): Promise<GeneratedQuestion[]> {
    const userA = users[0];
    const userB = users[1];

    const systemPrompt = '你是一个问题生成专家。';
    const userPrompt = this.buildPrompt(match, userA, userB, relationshipType);

    const result = await this.minimaxClient.chatJSON<AIQuestionResponse>(systemPrompt, userPrompt);

    return result.questions || [];
  }

  /**
   * 构建 AI prompt
   */
  private buildPrompt(
    match: MatchData,
    userA: UserData,
    userB: UserData,
    relationshipType: RelationshipType
  ): string {
    return `## 任务：生成争鸣层验证问题

根据以下匹配信息，生成结构化问题来验证双方的合作可行性。

### 匹配信息
- 关系类型：${relationshipType}
- 互补性评分：${match.complementarity_score}
- 未来生成性：${match.future_generativity}
- 综合评分：${match.overall_score}
- 匹配原因：${match.match_reason}
- 互补领域：${match.complementarity_areas.join(', ')}

### 用户A信息
- 姓名：${userA.name}
- 兴趣：${userA.interests?.join(', ') || '未设置'}
- 连接类型偏好：${userA.connection_types?.join(', ') || '未设置'}

### 用户B信息
- 姓名：${userB.name}
- 兴趣：${userB.interests?.join(', ') || '未设置'}
- 连接类型偏好：${userB.connection_types?.join(', ') || '未设置'}

### 问题要求
1. 每个关系类型生成 3 个问题
2. 问题类型分布：
   - scenario（情境模拟）：1个 - 模拟真实场景，测试实际反应
   - exploration（开放探索）：1个 - 探索价值观和动机
   - challenge（挑战性）：1个 - 挑战固有认知，测试边界
3. 每个问题必须包含：
   - id：唯一标识
   - type：问题类型
   - content：问题内容
   - purpose：问题目的
   - expectedDimensions：期望的回答维度

### 输出格式
请返回 JSON 格式：
{
  "questions": [
    {
      "id": "q1",
      "type": "scenario",
      "content": "问题内容",
      "purpose": "问题目的",
      "expectedDimensions": ["维度1", "维度2"]
    }
  ]
}

请根据关系类型 "${relationshipType}" 生成合适的问题。`;
  }
}

// =============================================================================
// 导出单例
// =============================================================================

let questionGeneratorInstance: QuestionGenerator | null = null;

/**
 * 获取 QuestionGenerator 单例
 */
export function getQuestionGenerator(): QuestionGenerator {
  if (!questionGeneratorInstance) {
    questionGeneratorInstance = new QuestionGenerator();
  }
  return questionGeneratorInstance;
}

/**
 * 重置 QuestionGenerator 单例
 */
export function resetQuestionGenerator(): void {
  questionGeneratorInstance = null;
}