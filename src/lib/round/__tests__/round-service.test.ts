/**
 * [INPUT]: 依赖 vitest 和 RoundService
 * [OUTPUT]: 对外提供圆桌讨论服务的 TDD 测试
 * [POS]: lib/round/__tests__/round-service.test.ts - 圆桌讨论单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoundService, resetRoundService } from '../round-service';

// ============================================
// Mock Supabase Chainable Pattern
// ============================================

const mockChain: Record<string, any> = {};
let mockMinimaxClient: any = null;

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      return mockChain[table] || createDefaultChain(table);
    }),
  },
}));

vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(() => mockMinimaxClient),
  resetMinimaxClient: vi.fn(),
}));

function createDefaultChain(_table: string) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  };
}

function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

function clearMockChains() {
  Object.keys(mockChain).forEach(key => delete mockChain[key]);
}

// ============================================
// Test Data Factories (snake_case for Supabase)
// ============================================

function createMockRound(overrides: any = {}) {
  return {
    id: 'round-123',
    topic_id: 'topic-456',
    name: '测试圆桌',
    description: '测试描述',
    max_agents: 5,
    status: 'waiting',
    summary: null,
    insights: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    topic: { id: 'topic-456', title: '测试话题' },
    participants: [],
    messages: [],
    ...overrides,
  };
}

function createMockTopic(overrides: any = {}) {
  return {
    id: 'topic-456',
    title: 'AI与未来',
    description: '讨论AI对未来的影响',
    category: 'technology',
    tags: ['AI', '未来'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockParticipant(overrides: any = {}) {
  return {
    id: 'participant-1',
    round_id: 'round-123',
    user_id: 'user-123',
    role: 'participant',
    joined_at: new Date().toISOString(),
    left_at: null,
    ...overrides,
  };
}

function createMockMessage(overrides: any = {}) {
  return {
    id: 'msg-123',
    round_id: 'round-123',
    agent_id: 'agent-123',
    content: '测试消息',
    type: 'text',
    metadata: null,
    reply_to: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockAgent(overrides: any = {}) {
  return {
    id: 'agent-123',
    user_id: 'user-123',
    name: '测试Agent',
    personality: '友好、理性',
    expertise: ['AI', '教育'],
    tone: 'friendly',
    is_active: true,
    last_active: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('RoundService', () => {
  let service: RoundService;

  beforeEach(() => {
    resetRoundService();
    vi.clearAllMocks();
    clearMockChains();

    // Setup Minimax mock
    mockMinimaxClient = {
      chat: vi.fn(),
      chatJSON: vi.fn(),
    };

    service = new RoundService();
  });

  // ============================================
  // createRound
  // ============================================

  describe('createRound', () => {
    it('应该创建圆桌并返回圆桌信息', async () => {
      // Arrange
      const mockTopic = createMockTopic({ id: 'topic-1' });
      const mockRound = createMockRound({
        id: 'round-1',
        topic_id: 'topic-1',
        name: 'AI是否会改变职业发展？',
        topic: mockTopic,
      });

      setupMockChain('topics', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTopic, error: null }),
      });

      setupMockChain('rounds', {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      setupMockChain('round_participants', {
        insert: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
      });

      // Act
      const round = await service.createRound({
        topicId: 'topic-1',
        name: 'AI是否会改变职业发展？',
        hostId: 'user-1',
      });

      // Assert
      expect(round).toBeDefined();
      expect(round.name).toBe('AI是否会改变职业发展？');
    });

    it('当话题不存在时应抛出错误', async () => {
      // Arrange
      setupMockChain('topics', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      // Act & Assert
      await expect(
        service.createRound({
          topicId: 'invalid-topic',
          name: '测试圆桌',
          hostId: 'user-1',
        })
      ).rejects.toThrow('话题不存在');
    });
  });

  // ============================================
  // joinRound
  // ============================================

  describe('joinRound', () => {
    it('用户成功加入圆桌', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: 'round-1',
        status: 'waiting',
        max_agents: 5,
        participants: [createMockParticipant({ user_id: 'user-1', role: 'host' })],
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      setupMockChain('round_participants', {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockParticipant({ user_id: 'user-2' }),
          error: null,
        }),
      });

      // Act
      const participant = await service.joinRound('round-1', 'user-2');

      // Assert
      expect(participant).toBeDefined();
      expect(participant.user_id).toBe('user-2');
    });

    it('圆桌已满时应拒绝加入', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: 'round-1',
        status: 'waiting',
        max_agents: 2,
        participants: [
          createMockParticipant({ user_id: 'user-1' }),
          createMockParticipant({ user_id: 'user-2' }),
        ],
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      // Act & Assert
      await expect(
        service.joinRound('round-1', 'user-3')
      ).rejects.toThrow('圆桌已满');
    });

    it('已开始的圆桌应拒绝加入', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: 'round-1',
        status: 'ongoing',
        participants: [],
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      // Act & Assert
      await expect(
        service.joinRound('round-1', 'user-2')
      ).rejects.toThrow('圆桌已开始或已结束');
    });
  });

  // ============================================
  // sendMessage
  // ============================================

  describe('sendMessage', () => {
    it('用户成功发送消息', async () => {
      // Arrange
      const mockRound = { id: 'round-1', status: 'ongoing' };
      const mockMessage = createMockMessage({
        content: '大家好，我来分享一些观点',
        agent: createMockAgent(),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      // round_participants - .select().eq().is() returns { data } directly
      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-1' }],
          error: null,
        }),
      });

      setupMockChain('agents', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockAgent({ user_id: 'user-1' }),
          error: null,
        }),
      });

      setupMockChain('messages', {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
      });

      // Act
      const message = await service.sendMessage({
        roundId: 'round-1',
        userId: 'user-1',
        content: '大家好，我来分享一些观点',
      });

      // Assert
      expect(message).toBeDefined();
      expect(message.content).toBe('大家好，我来分享一些观点');
    });

    it('非参与者应被拒绝发送消息', async () => {
      // Arrange
      const mockRound = { id: 'round-1', status: 'ongoing' };

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      });

      // Act & Assert
      await expect(
        service.sendMessage({
          roundId: 'round-1',
          userId: 'unauthorized-user',
          content: 'test',
        })
      ).rejects.toThrow('不是圆桌参与者');
    });
  });

  // ============================================
  // getMessages
  // ============================================

  describe('getMessages', () => {
    it('应返回圆桌消息历史', async () => {
      // Arrange
      const mockMessages = [
        createMockMessage({ id: 'msg-1', content: '消息1' }),
        createMockMessage({ id: 'msg-2', content: '消息2' }),
      ];

      setupMockChain('messages', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
      });

      // Act
      const result = await service.getMessages('round-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('消息1');
    });
  });

  // ============================================
  // generateAgentReply
  // ============================================

  describe('generateAgentReply', () => {
    it('Agent 应自动生成回复', async () => {
      // Arrange
      const mockRound = createMockRound({
        id: 'round-1',
        name: 'AI与未来教育',
        topic: createMockTopic({ title: 'AI与未来教育' }),
      });

      const mockAgent = createMockAgent({ id: 'agent-1' });

      const mockMessages = [
        createMockMessage({ content: '我认为AI会改变教育' }),
      ];

      const mockReplyMessage = createMockMessage({
        content: '这是一个很有趣的观点...',
        agent: mockAgent,
      });

      // Mock getRound
      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRound, error: null }),
      });

      // Mock messages - use mockImplementation to handle different patterns
      let callCount = 0;
      setupMockChain('messages', {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            order: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockReplyMessage, error: null }),
        })),
      });

      // Mock Minimax
      mockMinimaxClient.chat.mockResolvedValue('这是一个很有趣的观点...');

      // Act
      const reply = await service.generateAgentReply('round-1', mockAgent);

      // Assert
      expect(reply).toBeDefined();
      expect(mockMinimaxClient.chat).toHaveBeenCalled();
    });
  });
});
