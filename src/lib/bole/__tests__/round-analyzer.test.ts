/**
 * [INPUT]: 依赖 vitest 和 RoundAnalyzer，依赖 MinimaxClient 和 supabaseAdmin
 * [OUTPUT]: 对外提供圆桌分析器的 TDD 测试
 * [POS]: src/lib/bole/__tests__/round-analyzer.test.ts - 伯乐层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoundAnalyzer, RoundAnalyzerConfig } from '../round-analyzer';
import { getMinimaxClient, resetMinimaxClient } from '@/lib/ai/minimax-client';
import type { DbRound, DbMessage, DbUser } from '@/lib/supabase/types';

// =============================================================================
// Mock 配置 - Supabase chainable mock pattern
// =============================================================================

// 全局 mock chain 存储，支持多个 table 的不同 mock
const mockChain: Record<string, any> = {};

// Mock supabaseAdmin
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      return mockChain[table] || createDefaultChain(table);
    }),
  },
}));

// Mock Minimax 客户端
vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(),
  resetMinimaxClient: vi.fn(),
}));

/**
 * 创建 rounds table 的 mock chain
 * 使用: from('rounds').select('*').eq('id', id).single()
 */
function createRoundsChain(roundData: DbRound | null, error: any = null) {
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: roundData, error })),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    is: vi.fn(() => chain),
  };
  return chain;
}

/**
 * 创建 messages table 的 mock chain
 * 使用: from('messages').select('*').eq('round_id', id).order().range()
 * 需要返回 thenable 以支持 await
 */
function createMessagesChain(messages: DbMessage[]) {
  // 创建一个 thenable object
  const thenable = {
    then: vi.fn(function(resolve: any) {
      resolve({ data: messages, error: null });
    }),
    insert: vi.fn(() => thenable),
    select: vi.fn(() => thenable),
    update: vi.fn(() => thenable),
    delete: vi.fn(() => thenable),
    eq: vi.fn(() => thenable),
    single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
    order: vi.fn(() => thenable),
    range: vi.fn(() => thenable),
    limit: vi.fn(() => thenable),
    is: vi.fn(() => thenable),
  };
  return thenable;
}

/**
 * 创建 round_participants table 的 mock chain
 * 使用: from('round_participants').select('user:users(*)').eq('round_id', id)
 * 返回 Promise 以正确支持 await
 */
function createRoundParticipantsChain(participants: any[]) {
  // 返回 Promise 而不是 thenable，确保 await 正确等待
  const mockPromise = Promise.resolve({ data: participants, error: null });

  // 创建 chain 对象
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    is: vi.fn(() => chain),
  };

  // 让 chain 也能被 await，返回正确的 Promise
  // 这样 from().select().eq() 链式调用的最后一步可以 await
  const awaitableChain = Object.assign(chain, {
    then: (resolve: any, reject: any) => mockPromise.then(resolve, reject),
  });

  return awaitableChain;
}

/**
 * 设置特定 table 的 mock chain
 */
function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

describe('RoundAnalyzer', () => {
  let analyzer: RoundAnalyzer;
  let mockMinimaxClient: any;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    // 清空 chain
    Object.keys(mockChain).forEach(key => delete mockChain[key]);

    // 创建 mock Minimax 客户端
    mockMinimaxClient = {
      chatJSON: vi.fn(),
      chat: vi.fn(),
    };
    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient);

    // 创建默认配置的 analyzer
    analyzer = new RoundAnalyzer();
  });

  // =============================================================================
  // 构造函数测试
  // =============================================================================

  describe('constructor', () => {
    it('应使用默认配置', () => {
      const defaultAnalyzer = new RoundAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(RoundAnalyzer);
    });

    it('应接受自定义配置', () => {
      const customConfig: Partial<RoundAnalyzerConfig> = {
        minMessagesForAnalysis: 10,
        minDiscussionDuration: 10 * 60 * 1000,
        minimaxModel: 'test-model',
      };
      const customAnalyzer = new RoundAnalyzer(customConfig);
      expect(customAnalyzer).toBeInstanceOf(RoundAnalyzer);
    });
  });

  // =============================================================================
  // analyzeRound 测试
  // =============================================================================

  describe('analyzeRound', () => {
    const mockRoundId = 'round-123';

    it('圆桌不存在应抛出错误', async () => {
      // Arrange - 模拟圆桌不存在
      setupMockChain('rounds', createRoundsChain(null, null));

      // Act & Assert
      await expect(analyzer.analyzeRound(mockRoundId)).rejects.toThrow('圆桌不存在');
    });

    it('消息不足应返回兜底分析', async () => {
      // Arrange - 圆桌存在但消息不足
      const mockRound = createMockRound({ id: mockRoundId });
      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain([])); // 空消息

      // Act
      const result = await analyzer.analyzeRound(mockRoundId);

      // Assert
      expect(result.roundId).toBe(mockRoundId);
      expect(result.discussionQuality).toBe(50);
      expect(result.recommendation).toBe('讨论数据不足，无法生成有意义的分析');
    });

    it('参与者不足应返回兜底分析', async () => {
      // Arrange
      const mockRound = createMockRound({ id: mockRoundId });
      const mockMessages = createMockMessages(mockRoundId, 10);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain([])); // 空参与者

      // Act
      const result = await analyzer.analyzeRound(mockRoundId);

      // Assert
      expect(result.roundId).toBe(mockRoundId);
      expect(result.discussionQuality).toBe(50);
      expect(result.recommendation).toBe('讨论数据不足，无法生成有意义的分析');
    });

    it('正常情况应返回完整分析', async () => {
      // Arrange
      const mockRound = createMockRound({ id: mockRoundId });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(3);

      const aiAnalysisResult = {
        discussionQuality: 85,
        participationScore: 80,
        topicAlignment: 90,
        consensusLevel: 75,
        keyInsights: ['AI将改变教育', '技术实现是关键'],
        discussedTopics: ['AI教育', '技术实现'],
        participantInsights: mockParticipants.map((p) => ({
          userId: p.id,
          contributionScore: 75,
          perspectiveType: 'collaborative' as const,
          keyPositions: ['支持AI教育'],
          alignmentWithOthers: 70,
        })),
        relationshipDynamics: {
          consensusTopics: ['AI是未来'],
          conflictTopics: [],
          collaborativePairs: [{ userAId: 'user-1', userBId: 'user-2', score: 80 }],
          opposingPairs: [],
        },
        recommendation: '建议深入合作',
      };

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockResolvedValue(aiAnalysisResult);

      // Act
      const result = await analyzer.analyzeRound(mockRoundId);

      // Assert
      expect(result.roundId).toBe(mockRoundId);
      expect(result.discussionQuality).toBe(85);
      expect(result.participationScore).toBe(80);
      expect(result.topicAlignment).toBe(90);
      expect(result.consensusLevel).toBe(75);
      expect(result.keyInsights).toEqual(['AI将改变教育', '技术实现是关键']);
      expect(result.discussedTopics).toEqual(['AI教育', '技术实现']);
      expect(result.participantInsights).toHaveLength(3);
      expect(result.recommendation).toBe('建议深入合作');
    });

    it('AI调用失败应返回兜底分析', async () => {
      // Arrange
      const mockRound = createMockRound({ id: mockRoundId });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(2);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await analyzer.analyzeRound(mockRoundId);

      // Assert
      expect(result.roundId).toBe(mockRoundId);
      expect(result.discussionQuality).toBe(50);
      expect(result.recommendation).toBe('讨论数据不足，无法生成有意义的分析');
    });
  });

  // =============================================================================
  // getDiscussionQuality 测试
  // =============================================================================

  describe('getDiscussionQuality', () => {
    const mockRoundId = 'round-123';

    it('应返回讨论质量分数', async () => {
      // Arrange
      const mockRound = createMockRound({ id: mockRoundId });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(3);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockResolvedValue({
        discussionQuality: 88,
        participationScore: 80,
        topicAlignment: 85,
        consensusLevel: 75,
        keyInsights: [],
        discussedTopics: [],
        participantInsights: [],
        relationshipDynamics: {
          consensusTopics: [],
          conflictTopics: [],
          collaborativePairs: [],
          opposingPairs: [],
        },
        recommendation: '建议合作',
      });

      // Act
      const quality = await analyzer.getDiscussionQuality(mockRoundId);

      // Assert
      expect(quality).toBe(88);
    });
  });

  // =============================================================================
  // getParticipantContributions 测试
  // =============================================================================

  describe('getParticipantContributions', () => {
    const mockRoundId = 'round-123';

    it('应返回参与者贡献 Map', async () => {
      // Arrange
      const mockRound = createMockRound({ id: mockRoundId });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(3);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockResolvedValue({
        discussionQuality: 80,
        participationScore: 80,
        topicAlignment: 80,
        consensusLevel: 80,
        keyInsights: [],
        discussedTopics: [],
        participantInsights: [
          { userId: mockParticipants[0].id, contributionScore: 90, perspectiveType: 'analytical', keyPositions: [], alignmentWithOthers: 80 },
          { userId: mockParticipants[1].id, contributionScore: 70, perspectiveType: 'creative', keyPositions: [], alignmentWithOthers: 60 },
          { userId: mockParticipants[2].id, contributionScore: 85, perspectiveType: 'practical', keyPositions: [], alignmentWithOthers: 75 },
        ],
        relationshipDynamics: {
          consensusTopics: [],
          conflictTopics: [],
          collaborativePairs: [],
          opposingPairs: [],
        },
        recommendation: '建议合作',
      });

      // Act
      const contributions = await analyzer.getParticipantContributions(mockRoundId);

      // Assert
      expect(contributions).toBeInstanceOf(Map);
      expect(contributions.get(mockParticipants[0].id)).toBe(90);
      expect(contributions.get(mockParticipants[1].id)).toBe(70);
      expect(contributions.get(mockParticipants[2].id)).toBe(85);
    });
  });

  // =============================================================================
  // isReadyForMatching 测试
  // =============================================================================

  describe('isReadyForMatching', () => {
    const mockRoundId = 'round-123';

    it('圆桌不存在应返回 not ready', async () => {
      // Arrange
      setupMockChain('rounds', createRoundsChain(null, null));

      // Act
      const result = await analyzer.isReadyForMatching(mockRoundId);

      // Assert
      expect(result.ready).toBe(false);
      expect(result.reason).toBe('圆桌不存在');
      expect(result.qualityScore).toBe(0);
    });

    it('时长不足应返回 not ready', async () => {
      // Arrange - 圆桌刚创建，讨论时长不足
      const mockRound = createMockRound({
        id: mockRoundId,
        created_at: new Date().toISOString(), // 现在创建
      });
      const mockMessages = createMockMessages(mockRoundId, 10);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));

      // Act
      const result = await analyzer.isReadyForMatching(mockRoundId);

      // Assert
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('讨论时长不足');
      expect(result.qualityScore).toBe(0);
    });

    it('消息不足应返回 not ready', async () => {
      // Arrange - 时长足够但消息不足
      const mockRound = createMockRound({
        id: mockRoundId,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10分钟前
      });
      const mockMessages = createMockMessages(mockRoundId, 2); // 只有2条消息

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        createMockParticipants(3).map((p) => ({ user: p }))
      ));

      // Act
      const result = await analyzer.isReadyForMatching(mockRoundId);

      // Assert
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('消息数量不足');
      expect(result.qualityScore).toBe(0);
    });

    it('质量达标应返回 ready', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: mockRoundId,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(3);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockResolvedValue({
        discussionQuality: 75, // 高于50阈值
        participationScore: 80,
        topicAlignment: 85,
        consensusLevel: 70,
        keyInsights: [],
        discussedTopics: [],
        participantInsights: [],
        relationshipDynamics: {
          consensusTopics: [],
          conflictTopics: [],
          collaborativePairs: [],
          opposingPairs: [],
        },
        recommendation: '适合生成知遇卡',
      });

      // Act
      const result = await analyzer.isReadyForMatching(mockRoundId);

      // Assert
      expect(result.ready).toBe(true);
      expect(result.reason).toBe('适合生成知遇卡');
      expect(result.qualityScore).toBe(75);
    });

    it('质量不达标应返回 not ready', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: mockRoundId,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });
      const mockMessages = createMockMessages(mockRoundId, 10);
      const mockParticipants = createMockParticipants(3);

      setupMockChain('rounds', createRoundsChain(mockRound));
      setupMockChain('messages', createMessagesChain(mockMessages));
      setupMockChain('round_participants', createRoundParticipantsChain(
        mockParticipants.map((p) => ({ user: p }))
      ));

      mockMinimaxClient.chatJSON.mockResolvedValue({
        discussionQuality: 30, // 低于50阈值
        participationScore: 40,
        topicAlignment: 35,
        consensusLevel: 25,
        keyInsights: [],
        discussedTopics: [],
        participantInsights: [],
        relationshipDynamics: {
          consensusTopics: [],
          conflictTopics: [],
          collaborativePairs: [],
          opposingPairs: [],
        },
        recommendation: '讨论质量不足',
      });

      // Act
      const result = await analyzer.isReadyForMatching(mockRoundId);

      // Assert
      expect(result.ready).toBe(false);
      expect(result.reason).toBe('讨论质量不足');
      expect(result.qualityScore).toBe(30);
    });
  });
});

// =============================================================================
// 辅助函数
// =============================================================================

function createMockRound(overrides: Partial<DbRound> = {}): DbRound {
  return {
    id: 'round-123',
    topic_id: 'topic-456',
    name: '测试圆桌',
    description: '这是一个测试圆桌',
    max_agents: 5,
    status: 'active',
    summary: null,
    insights: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5分钟前
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockParticipants(count: number): DbUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    name: `测试用户${i + 1}`,
    avatar_url: null,
    secondme_id: `secondme-${i + 1}`,
    interests: ['AI', '教育'],
    connection_types: ['cofounder', 'peer'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

function createMockMessages(roundId: string, count: number): DbMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i + 1}`,
    round_id: roundId,
    agent_id: `agent-${i + 1}`,
    content: `这是第 ${i + 1} 条测试消息`,
    type: 'text',
    metadata: null,
    reply_to: null,
    created_at: new Date().toISOString(),
  }));
}
