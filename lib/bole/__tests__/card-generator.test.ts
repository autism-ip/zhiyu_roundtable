/**
 * [INPUT]: 依赖 vitest 和 CardGenerator
 * [OUTPUT]: 对外提供知遇卡生成器的 TDD 测试
 * [POS]: lib/bole/__tests__/card-generator.test.ts - 伯乐层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardGenerator, CardGeneratorConfig } from '../card-generator';
import type { Round, Message, User } from '@/types';

describe('CardGenerator', () => {
  let generator: CardGenerator;

  beforeEach(() => {
    generator = new CardGenerator({
      minComplementarityScore: 60,
      maxMatchesPerRound: 3,
    });
  });

  describe('generateMatches', () => {
    it('当圆桌讨论不足5分钟时应返回空数组', async () => {
      // Arrange
      const round = createMockRound({
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4分钟前
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toEqual([]);
    });

    it('当互补性评分低于阈值时应过滤掉', async () => {
      // Arrange - 创建一个讨论时间足够但互补性低的场景
      const round = createMockRound({
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10分钟前
      });

      // Mock 内部方法返回低分结果
      const mockParticipants = createMockParticipants(2);
      const mockMessages = createMockMessages();

      // 使用 spy 来模拟内部依赖
      vi.spyOn(generator as any, 'getRoundParticipants').mockResolvedValue(mockParticipants);
      vi.spyOn(generator as any, 'getRoundMessages').mockResolvedValue(mockMessages);
      vi.spyOn(generator as any, 'analyzeComplementarity').mockResolvedValue({
        complementarityScore: 55, // 低于60分阈值
        futureGenerativity: 50,
        overallScore: 52.5,
        relationshipType: 'none',
        matchReason: '',
        complementarityAreas: [],
        insights: [],
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toEqual([]);
    });

    it('应返回按评分排序的知遇卡', async () => {
      // Arrange
      const round = createMockRound({
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      });

      const mockParticipants = createMockParticipants(4); // 4个参与者 = 6对组合
      const mockMessages = createMockMessages();

      vi.spyOn(generator as any, 'getRoundParticipants').mockResolvedValue(mockParticipants);
      vi.spyOn(generator as any, 'getRoundMessages').mockResolvedValue(mockMessages);

      // 模拟不同的互补性评分
      let callCount = 0;
      vi.spyOn(generator as any, 'analyzeComplementarity').mockImplementation(() => {
        callCount++;
        const scores = [85, 70, 90, 65, 75, 80]; // 不同的分数
        const score = scores[(callCount - 1) % scores.length];
        return Promise.resolve({
          complementarityScore: score,
          futureGenerativity: score + 5,
          overallScore: score + 2.5,
          relationshipType: score > 75 ? 'cofounder' : 'peer',
          matchReason: `互补性评分: ${score}`,
          complementarityAreas: ['技术', '产品'],
          insights: ['有合作潜力'],
        });
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toHaveLength(3); // 最多返回3个
      expect(matches[0].overallScore).toBeGreaterThanOrEqual(matches[1].overallScore);
      expect(matches[1].overallScore).toBeGreaterThanOrEqual(matches[2].overallScore);
    });

    it('知遇卡应包含必需的元数据', async () => {
      // Arrange
      const round = createMockRound({
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });

      const mockParticipants = createMockParticipants(2);
      const mockMessages = createMockMessages();

      vi.spyOn(generator as any, 'getRoundParticipants').mockResolvedValue(mockParticipants);
      vi.spyOn(generator as any, 'getRoundMessages').mockResolvedValue(mockMessages);
      vi.spyOn(generator as any, 'analyzeComplementarity').mockResolvedValue({
        complementarityScore: 85,
        futureGenerativity: 88,
        overallScore: 86.5,
        relationshipType: 'cofounder',
        matchReason: '你们在AI和教育领域有高度互补的专业背景',
        complementarityAreas: ['技术', '教育', '产品设计'],
        insights: [
          '用户A在技术实现上有深度',
          '用户B在教育场景理解上有优势',
          '组合后可能产生创新的教育产品',
        ],
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        userAId: expect.any(String),
        userBId: expect.any(String),
        complementarityScore: 85,
        futureGenerativity: 88,
        overallScore: 86.5,
        relationshipType: 'cofounder',
        matchReason: expect.any(String),
        complementarityAreas: expect.arrayContaining([expect.any(String)]),
        insights: expect.arrayContaining([expect.any(String)]),
      });
    });
  });
});

// 辅助函数
function createMockRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-123',
    topicId: 'topic-456',
    name: '测试圆桌',
    status: 'completed',
    participantCount: 5,
    messageCount: 50,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Round;
}

function createMockParticipants(count: number): User[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    name: `测试用户${i + 1}`,
    avatar: null,
    secondmeId: `secondme-${i + 1}`,
    interests: ['AI', '教育', '技术'],
    connectionTypes: ['cofounder', 'peer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function createMockMessages(): Message[] {
  return [
    {
      id: '1',
      roundId: 'round-123',
      agentId: 'agent-1',
      content: '我认为AI会彻底改变教育方式...',
      type: 'text',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      roundId: 'round-123',
      agentId: 'agent-2',
      content: '但从技术实现角度，我们还需要解决...',
      type: 'text',
      createdAt: new Date().toISOString(),
    },
  ];
}
