/**
 * [INPUT]: 依赖 vitest, QuestionGenerator, getMinimaxClient, DbUser, DbMatch
 * [OUTPUT]: 对外提供争鸣层问题生成器的 TDD 测试
 * [POS]: src/lib/zhengming/__tests__/question-generator.test.ts - 争鸣层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionGenerator, QuestionGeneratorConfig } from '../question-generator';
import { getMinimaxClient, resetMinimaxClient } from '@/lib/ai/minimax-client';
import { supabaseAdmin } from '@/lib/supabase/client';

// =============================================================================
// Mock 配置
// =============================================================================

// 链式 mock 配置
const createMockQuery = (mockData: any = null, mockError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
});

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(() => createMockQuery()),
  },
}));

vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(() => ({
    chatJSON: vi.fn(),
    chat: vi.fn(),
  })),
  resetMinimaxClient: vi.fn(),
}));

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator;
  let mockMinimaxClient: any;
  let mockSupabaseFrom: any;

  // 创建可链式调用的 mock
  const createMockQuery = (data: any = null, error: any = null) => {
    const query: any = {
      select: vi.fn().mockReturnThis(),
    };
    query.eq = vi.fn().mockReturnValue(query);
    query.in = vi.fn().mockReturnValue(query);
    query.single = vi.fn().mockResolvedValue({ data, error });
    query.order = vi.fn().mockReturnThis();
    query.limit = vi.fn().mockReturnThis();
    return query;
  };

  // 为不同调用次数设置不同的 mock 数据
  const mockSelect = (results: any[]) => {
    let callCount = 0;

    // 模拟 .single() 的多次调用（用于 .eq().single() 链）
    mockSupabaseFrom.single.mockImplementation(() => {
      const result = results[callCount] || results[results.length - 1] || { data: null, error: null };
      callCount++;
      return Promise.resolve(result);
    });

    // 模拟 .in() 返回一个 thenable（用于 .in() 后直接 await 的情况）
    // Supabase 查询被 await 时解析为 { data, error }
    mockSupabaseFrom.in.mockImplementation(() => {
      const inResult = results[1] || results[0] || { data: null, error: null };
      // 返回一个 thenable，当被 await 时解析为 { data, error }
      const thenable = {
        then: (resolve: (val: any) => void) => {
          resolve({ data: inResult.data, error: inResult.error });
        },
      };
      return thenable;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MiniMax
    mockMinimaxClient = {
      chatJSON: vi.fn(),
      chat: vi.fn(),
    };
    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient);

    // Mock Supabase - 每次 from() 调用返回新的 mock query
    mockSupabaseFrom = createMockQuery();
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockSupabaseFrom as any);

    generator = new QuestionGenerator();
  });

  // =============================================================================
  // 构造函数测试
  // =============================================================================

  describe('constructor', () => {
    it('应使用默认配置', () => {
      const defaultGenerator = new QuestionGenerator();
      expect(defaultGenerator).toBeInstanceOf(QuestionGenerator);
    });

    it('应接受自定义配置', () => {
      const customConfig: Partial<QuestionGeneratorConfig> = {
        questionsPerType: 3,
        minimaxModel: 'test-model',
      };
      const customGenerator = new QuestionGenerator(customConfig);
      expect(customGenerator).toBeInstanceOf(QuestionGenerator);
    });
  });

  // =============================================================================
  // generateQuestions 测试
  // =============================================================================

  describe('generateQuestions', () => {
    const mockMatchId = 'match-123';

    it('匹配不存在应抛出错误', async () => {
      mockSelect([{ data: null, error: null }]);

      await expect(generator.generateQuestions(mockMatchId)).rejects.toThrow('匹配不存在');
    });

    it('应根据关系类型生成问题', async () => {
      const mockMatch = createMockMatch({
        id: mockMatchId,
        relationship_type: 'cofounder',
      });
      const mockUsers = createMockUsers();

      mockSelect([
        { data: mockMatch, error: null },
        { data: mockUsers, error: null },
      ]);

      mockMinimaxClient.chatJSON.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            type: 'scenario',
            content: '场景：如果你们要一起创业，商业模式如何设计？',
            purpose: '验证商业思维互补性',
            expectedDimensions: ['商业模式', '风险承担', '决策风格'],
          },
          {
            id: 'q2',
            type: 'exploration',
            content: '你们对成功的定义是什么？',
            purpose: '探索价值观一致性',
            expectedDimensions: ['成功定义', '动机来源', '价值取向'],
          },
          {
            id: 'q3',
            type: 'challenge',
            content: '描述一个你们观点不一致的场景',
            purpose: '评估冲突处理能力',
            expectedDimensions: ['沟通模式', '妥协意愿', '底线认知'],
          },
        ],
      });

      const result = await generator.generateQuestions(mockMatchId);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('scenario');
    });

    it('应支持所有关系类型', async () => {
      const relationshipTypes = ['cofounder', 'peer', 'opponent', 'advisor', 'mentee'] as const;

      for (const relType of relationshipTypes) {
        const mockMatch = createMockMatch({
          id: `match-${relType}`,
          relationship_type: relType,
        });

        mockSelect([
          { data: mockMatch, error: null },
          { data: createMockUsers(), error: null },
        ]);

        mockMinimaxClient.chatJSON.mockResolvedValue({
          questions: [{ id: 'q1', type: 'scenario', content: '测试问题', purpose: '测试', expectedDimensions: [] }],
        });

        const result = await generator.generateQuestions(`match-${relType}`);
        expect(result).toBeDefined();
      }
    });

    it('AI调用失败应返回默认问题', async () => {
      const mockMatch = createMockMatch({ id: mockMatchId, relationship_type: 'peer' });

      mockSelect([
        { data: mockMatch, error: null },
        { data: createMockUsers(), error: null },
      ]);

      mockMinimaxClient.chatJSON.mockRejectedValue(new Error('API Error'));

      const result = await generator.generateQuestions(mockMatchId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // generateScenarioQuestion 测试
  // =============================================================================

  describe('generateScenarioQuestion', () => {
    it('应生成情境模拟问题', async () => {
      const mockMatch = createMockMatch({ relationship_type: 'cofounder' });
      const mockUsers = createMockUsers();

      mockSelect([
        { data: mockMatch, error: null },
        { data: mockUsers, error: null },
      ]);

      mockMinimaxClient.chatJSON.mockResolvedValue({
        id: 'q1',
        type: 'scenario',
        content: '情境：你们的产品遇到用户投诉，如何处理？',
        purpose: '测试危机处理能力',
        expectedDimensions: ['响应速度', '解决方案', '用户关怀'],
      });

      const result = await generator.generateScenarioQuestion('match-123');

      expect(result.type).toBe('scenario');
      expect(result.content).toBeDefined();
      expect(result.purpose).toBeDefined();
    });
  });

  // =============================================================================
  // generateExplorationQuestion 测试
  // =============================================================================

  describe('generateExplorationQuestion', () => {
    it('应生成开放探索问题', async () => {
      const mockMatch = createMockMatch({ relationship_type: 'peer' });
      const mockUsers = createMockUsers();

      mockSelect([
        { data: mockMatch, error: null },
        { data: mockUsers, error: null },
      ]);

      mockMinimaxClient.chatJSON.mockResolvedValue({
        id: 'q2',
        type: 'exploration',
        content: '你们的长期职业目标是什么？',
        purpose: '探索发展方向的兼容性',
        expectedDimensions: ['职业规划', '成长需求', '价值实现'],
      });

      const result = await generator.generateExplorationQuestion('match-123');

      expect(result.type).toBe('exploration');
    });
  });

  // =============================================================================
  // generateChallengeQuestion 测试
  // =============================================================================

  describe('generateChallengeQuestion', () => {
    it('应生成挑战性问题', async () => {
      const mockMatch = createMockMatch({ relationship_type: 'opponent' });
      const mockUsers = createMockUsers();

      mockSelect([
        { data: mockMatch, error: null },
        { data: mockUsers, error: null },
      ]);

      mockMinimaxClient.chatJSON.mockResolvedValue({
        id: 'q3',
        type: 'challenge',
        content: '什么时候你会质疑对方的判断？',
        purpose: '评估冲突处理边界',
        expectedDimensions: ['信任边界', '独立思考', '沟通方式'],
      });

      const result = await generator.generateChallengeQuestion('match-123');

      expect(result.type).toBe('challenge');
    });
  });

  // =============================================================================
  // getQuestionsByType 测试
  // =============================================================================

  describe('getQuestionsByType', () => {
    it('应按类型过滤问题', async () => {
      const mockMatch = createMockMatch({ id: 'match-123', relationship_type: 'advisor' });
      const mockUsers = createMockUsers();

      mockSelect([
        { data: mockMatch, error: null },
        { data: mockUsers, error: null },
      ]);

      mockMinimaxClient.chatJSON.mockResolvedValue({
        questions: [
          { id: 'q1', type: 'scenario', content: '场景问题', purpose: 'p', expectedDimensions: [] },
          { id: 'q2', type: 'exploration', content: '探索问题', purpose: 'p', expectedDimensions: [] },
          { id: 'q3', type: 'scenario', content: '另一个场景', purpose: 'p', expectedDimensions: [] },
        ],
      });

      await generator.generateQuestions('match-123');
      const scenarioQuestions = generator.getQuestionsByType('scenario');

      expect(scenarioQuestions).toHaveLength(2);
    });
  });

  // =============================================================================
  // getDefaultQuestions 测试
  // =============================================================================

  describe('getDefaultQuestions', () => {
    it('cofounder应返回默认问题', () => {
      const questions = generator.getDefaultQuestions('cofounder');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('peer应返回默认问题', () => {
      const questions = generator.getDefaultQuestions('peer');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('opponent应返回默认问题', () => {
      const questions = generator.getDefaultQuestions('opponent');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('advisor应返回默认问题', () => {
      const questions = generator.getDefaultQuestions('advisor');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('mentee应返回默认问题', () => {
      const questions = generator.getDefaultQuestions('mentee');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('unknown类型应返回通用问题', () => {
      const questions = generator.getDefaultQuestions('unknown' as any);
      expect(questions.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// 辅助函数
// =============================================================================

function createMockMatch(overrides: Partial<any> = {}): any {
  return {
    id: 'match-123',
    round_id: 'round-456',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    complementarity_score: 85,
    future_generativity: 80,
    overall_score: 82,
    relationship_type: 'peer',
    match_reason: '测试匹配',
    complementarity_areas: ['技术', '产品'],
    insights: [],
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockUsers(): any[] {
  return [
    {
      id: 'user-a',
      email: 'usera@example.com',
      name: '用户A',
      avatar_url: null,
      secondme_id: 'sm-a',
      interests: ['AI', '产品'],
      connection_types: ['cofounder'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-b',
      email: 'userb@example.com',
      name: '用户B',
      avatar_url: null,
      secondme_id: 'sm-b',
      interests: ['商业', '运营'],
      connection_types: ['cofounder'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}