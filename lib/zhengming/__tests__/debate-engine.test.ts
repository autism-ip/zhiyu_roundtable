/**
 * [INPUT]: 依赖 vitest 和 DebateEngine
 * [OUTPUT]: 对外提供争鸣层对练引擎的 TDD 测试
 * [POS]: lib/zhengming/__tests__/debate-engine.test.ts - 争鸣层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebateEngine, DebateEngineConfig } from '../debate-engine';
import type { Match, User } from '@/types';

describe('DebateEngine', () => {
  let engine: DebateEngine;

  beforeEach(() => {
    engine = new DebateEngine({
      minQuestions: 3,
      maxQuestions: 5,
      analysisThreshold: 70,
    });
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

      // Mock 内部方法
      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([
        createMockResponse(),
        createMockResponse(),
        createMockResponse(),
      ]);

      vi.spyOn(engine as any, 'analyzeResponses').mockResolvedValue({
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

      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([]);
      vi.spyOn(engine as any, 'analyzeResponses').mockResolvedValue({
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

      vi.spyOn(engine as any, 'getDebateResponses').mockResolvedValue([]);
      vi.spyOn(engine as any, 'analyzeResponses').mockResolvedValue({
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
      vi.spyOn(engine as any, 'analyzeResponses').mockResolvedValue({
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
