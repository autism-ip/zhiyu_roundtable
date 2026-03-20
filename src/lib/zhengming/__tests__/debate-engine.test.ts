/**
 * [INPUT]: 依赖 vitest 和 DebateEngine，依赖 MinimaxClient
 * [OUTPUT]: 对外提供争鸣层对练引擎的 TDD 测试
 * [POS]: lib/zhengming/__tests__/debate-engine.test.ts - 争鸣层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebateEngine, DebateEngineConfig } from '../debate-engine';
import { getMinimaxClient, resetMinimaxClient } from '@/lib/ai/minimax-client';
import type { Match, User } from '@/types';

// Mock Minimax 客户端
vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(),
  resetMinimaxClient: vi.fn(),
}));

describe('DebateEngine', () => {
  let engine: DebateEngine;
  let mockMinimaxClient: any;

  beforeEach(() => {
    // 创建 mock 客户端
    mockMinimaxClient = {
      chatJSON: vi.fn(),
      chat: vi.fn(),
    };

    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient as any);

    engine = new DebateEngine({
      minQuestions: 3,
      maxQuestions: 5,
      analysisThreshold: 70,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMinimaxClient();
  });

  describe('initiateDebate', () => {
    it('应该生成指定数量的争鸣层问题', async () => {
      // Arrange
      const match = createMockMatch();

      // Act
      const result = await engine.initiateDebate(match);

      // Assert
      expect(result.questions).toHaveLength(3);
      expect(result.questions[0]).toMatchObject({
        id: expect.any(String),
        question: expect.any(String),
        type: expect.stringMatching(/scenario|conflict|decision/),
        context: expect.any(String),
      });
    });

    it('应该根据关系类型生成相应的问题', async () => {
      // Arrange
      const cofounderMatch = createMockMatch({ relationshipType: 'cofounder' });
      const peerMatch = createMockMatch({ relationshipType: 'peer' });

      // Act
      const cofounderResult = await engine.initiateDebate(cofounderMatch);
      const peerResult = await engine.initiateDebate(peerMatch);

      // Assert
      expect(cofounderResult.questions).toHaveLength(3);
      expect(peerResult.questions).toHaveLength(3);
    });

    it('应该初始化空的回答列表', async () => {
      // Arrange
      const match = createMockMatch();

      // Act
      const result = await engine.initiateDebate(match);

      // Assert
      expect(result.responses).toEqual([]);
    });
  });

  describe('completeDebate', () => {
    it('应该分析回答并生成分析报告', async () => {
      // Arrange
      const debateId = 'debate-123';

      // Mock 获取回答
      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([
        createMockResponse(),
        createMockResponse(),
        createMockResponse(),
      ]);

      // Mock Minimax 分析结果
      mockMinimaxClient.chatJSON.mockResolvedValue({
        concessionAbility: 75,
        boundaryAwareness: 80,
        riskAppetite: 65,
        decisionStyle: {
          userA: 'analytical',
          userB: 'intuitive',
        },
        disagreementType: ['approach', 'priority'],
        healthScore: 78,
      });

      // Act
      const result = await engine.completeDebate(debateId);

      // Assert
      expect(result.analysis).toMatchObject({
        concessionAbility: expect.any(Number),
        boundaryAwareness: expect.any(Number),
        riskAppetite: expect.any(Number),
        healthScore: expect.any(Number),
      });
    });

    it('健康度评分高于阈值时应该建议继续联系', async () => {
      // Arrange
      const debateId = 'debate-123';

      // 提供有效的响应数据，避免触发 fallback
      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([
        {
          questionId: 'q1',
          userAId: 'user-a',
          userBId: 'user-b',
          userAResponse: '我会倾听对方意见并寻求共识',
          userBResponse: '我会在坚持原则的同时灵活处理',
          timestamp: new Date().toISOString(),
        },
      ]);
      mockMinimaxClient.chatJSON.mockResolvedValue({
        concessionAbility: 85,
        boundaryAwareness: 88,
        riskAppetite: 75,
        decisionStyle: { userA: 'analytical', userB: 'analytical' },
        disagreementType: [],
        healthScore: 85, // 高于70阈值
      });

      // Act
      const result = await engine.completeDebate(debateId);

      // Assert
      expect(result.shouldConnect).toBe(true);
      expect(result.relationshipSuggestion).toContain('建议');
    });

    it('健康度评分低于阈值时不应该建议继续联系', async () => {
      // Arrange
      const debateId = 'debate-123';

      // 提供有效的响应数据，避免触发 fallback
      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([
        {
          questionId: 'q1',
          userAId: 'user-a',
          userBId: 'user-b',
          userAResponse: '我坚持我的观点不让步',
          userBResponse: '我认为应该完全按照我的方式做',
          timestamp: new Date().toISOString(),
        },
      ]);
      mockMinimaxClient.chatJSON.mockResolvedValue({
        concessionAbility: 50,
        boundaryAwareness: 55,
        riskAppetite: 40,
        decisionStyle: { userA: 'intuitive', userB: 'analytical' },
        disagreementType: ['approach', 'priority', 'values'],
        healthScore: 55, // 低于70阈值
      });

      // Act
      const result = await engine.completeDebate(debateId);

      // Assert
      expect(result.shouldConnect).toBe(false);
    });

    it('应该识别风险领域', async () => {
      // Arrange
      const debateId = 'debate-123';

      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([]);
      mockMinimaxClient.chatJSON.mockResolvedValue({
        concessionAbility: 60,
        boundaryAwareness: 75,
        riskAppetite: 85,
        decisionStyle: { userA: 'intuitive', userB: 'intuitive' },
        disagreementType: ['approach'],
        healthScore: 72,
      });

      // Act
      const result = await engine.completeDebate(debateId);

      // Assert
      expect(result.riskAreas).toBeInstanceOf(Array);
      expect(result.riskAreas.length).toBeGreaterThan(0);
    });
  });
});

// 辅助函数
function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-123',
    roundId: 'round-456',
    userAId: 'user-a',
    userBId: 'user-b',
    complementarityScore: 80,
    futureGenerativity: 85,
    overallScore: 82.5,
    relationshipType: 'cofounder',
    matchReason: '高度互补的技能组合',
    complementarityAreas: ['技术', '产品'],
    insights: ['有很好的合作潜力'],
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockResponse(): any {
  return {
    questionId: `q-${Math.random().toString(36).substr(2, 9)}`,
    userAId: 'user-a',
    userBId: 'user-b',
    userAResponse: '我会先倾听对方的观点，然后寻找共同点...',
    userBResponse: '我认为应该坚持原则，但同时保持开放的心态...',
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// AI 集成测试 - Minimax 调用
// ============================================

describe('DebateEngine AI Integration', () => {
  let engine: DebateEngine;
  let mockMinimaxClient: any;

  beforeEach(() => {
    // 创建 mock 客户端
    mockMinimaxClient = {
      chatJSON: vi.fn(),
      chat: vi.fn(),
    };

    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient as any);

    engine = new DebateEngine({
      minQuestions: 3,
      maxQuestions: 5,
      analysisThreshold: 70,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMinimaxClient();
  });

  it('应调用 Minimax API 生成争鸣层问题', async () => {
    // Arrange
    const match = createMockMatch({
      relationshipType: 'cofounder',
    });

    // Mock Minimax 返回
    mockMinimaxClient.chatJSON.mockResolvedValue({
      questions: [
        {
          id: 'q1',
          question: '如果你们要一起创业，商业模式分歧时如何决策？',
          type: 'conflict',
          context: '测试冲突解决能力',
        },
        {
          id: 'q2',
          question: '描述你们处理过的最大风险事件',
          type: 'scenario',
          context: '了解风险应对方式',
        },
        {
          id: 'q3',
          question: '当利益和价值观冲突时，你们会如何选择？',
          type: 'decision',
          context: '测试价值观一致性',
        },
      ],
    });

    // Act
    const result = await engine.initiateDebate(match);

    // Assert - 验证 Minimax 被调用
    expect(mockMinimaxClient.chatJSON).toHaveBeenCalled();
    expect(result.questions).toHaveLength(3);
  });

  it('应调用 Minimax API 分析用户回答', async () => {
    // Arrange
    const debateId = 'debate-123';
    const mockResponses = [
      {
        questionId: 'q1',
        userAId: 'user-a',
        userBId: 'user-b',
        userAResponse: '我会先倾听对方观点，寻找共同点，再表达我的看法。',
        userBResponse: '坚持原则但保持开放，必要时各退一步。',
        timestamp: new Date().toISOString(),
      },
      {
        questionId: 'q2',
        userAId: 'user-a',
        userBId: 'user-b',
        userAResponse: '我会做充分的调研，然后快速决策',
        userBResponse: '我会先小规模测试，验证后再全面推广',
        timestamp: new Date().toISOString(),
      },
    ];

    vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue(mockResponses);

    // Mock Minimax 分析结果
    mockMinimaxClient.chatJSON.mockResolvedValue({
      concessionAbility: 80,
      boundaryAwareness: 75,
      riskAppetite: 65,
      decisionStyle: {
        userA: 'analytical',
        userB: 'collaborative',
      },
      disagreementType: ['approach'],
      healthScore: 78,
    });

    // Act
    const result = await engine.completeDebate(debateId);

    // Assert - 验证 Minimax 被调用进行回答分析
    expect(mockMinimaxClient.chatJSON).toHaveBeenCalled();
    expect(result.analysis.healthScore).toBe(78);
  });

  it('当 Minimax API 失败时应使用兜底方案', async () => {
    // Arrange
    const debateId = 'debate-123';

    vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([createMockResponse()]);
    mockMinimaxClient.chatJSON.mockRejectedValue(new Error('API Error'));

    // Act
    const result = await engine.completeDebate(debateId);

    // Assert - 应该返回兜底数据而不是抛出异常
    expect(result.analysis.healthScore).toBeDefined();
    expect(result.shouldConnect).toBeDefined();
  });
});
