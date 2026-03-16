/**
 * [INPUT]: 依赖 vitest 和 RoundService
 * [OUTPUT]: 对外提供圆桌讨论服务的 TDD 测试
 * [POS]: lib/round/__tests__/round-service.test.ts - 圆桌讨论单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoundService, RoundServiceConfig } from '../round-service';
import { getMinimaxClient, resetMinimaxClient } from '@/lib/ai/minimax-client';
import type { Round, RoundParticipant, Message, User, Topic, Agent } from '@/types';

// Mock Minimax 客户端
vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(),
  resetMinimaxClient: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    round: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    roundUser: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    topic: {
      findUnique: vi.fn(),
    },
  },
}));

describe('RoundService', () => {
  let service: RoundService;
  let mockMinimaxClient: any;
  let mockPrisma: any;

  beforeEach(() => {
    // 创建 mock 客户端
    mockMinimaxClient = {
      chat: vi.fn(),
      chatJSON: vi.fn(),
    };

    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient as any);

    // Mock Prisma - 包含完整的模拟数据
    mockPrisma = {
      round: {
        findUnique: vi.fn().mockImplementation((opts: any) => {
          const roundId = opts?.where?.id;
          if (roundId === 'round-1') {
            const includeParticipants = opts?.include?.participants;
            return Promise.resolve({
              id: 'round-1',
              topicId: 'topic-1',
              name: '测试圆桌',
              description: null,
              maxAgents: includeParticipants ? 2 : 5, // 测试满员场景
              status: 'waiting',
              summary: null,
              insights: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              participants: includeParticipants ? [
                { id: 'p1', roundId: 'round-1', userId: 'user-1', role: 'host', joinedAt: new Date() },
              ] : [],
            });
          }
          return Promise.resolve(null);
        }),
        findMany: vi.fn(),
        create: vi.fn().mockImplementation((opts: any) => ({
          id: 'round-' + Date.now(),
          ...opts.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          topic: { id: 'topic-1', title: '测试话题' },
          participants: [],
          messages: [],
        })),
        update: vi.fn(),
        delete: vi.fn(),
      },
      roundUser: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          if (where?.roundId === 'round-1') {
            return Promise.resolve([
              { id: 'p1', roundId: 'round-1', userId: 'user-1', role: 'host', joinedAt: new Date() },
            ]);
          }
          return Promise.resolve([]);
        }),
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation((opts: any) => ({
          id: 'participant-' + Date.now(),
          ...opts.data,
        })),
        delete: vi.fn(),
      },
      message: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          if (where?.roundId === 'round-1') {
            return Promise.resolve([
              { id: 'msg-1', roundId: 'round-1', agentId: 'agent-1', content: '消息1', type: 'text', createdAt: new Date() },
            ]);
          }
          return Promise.resolve([]);
        }),
        create: vi.fn().mockImplementation((opts: any) => ({
          id: 'msg-' + Date.now(),
          ...opts.data,
          createdAt: new Date(),
        })),
      },
      topic: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where?.id === 'topic-1') {
            return Promise.resolve({
              id: 'topic-1',
              title: 'AI与职业',
              description: '讨论AI对职业的影响',
              category: 'technology',
              tags: ['AI', '职业'],
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
      },
      agent: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where?.userId === 'user-1') {
            return Promise.resolve({
              id: 'agent-1',
              userId: 'user-1',
              name: '测试Agent',
              personality: '友好',
              expertise: ['AI'],
              tone: 'friendly',
              isActive: true,
              lastActive: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        update: vi.fn(),
      },
    };

    service = new RoundService(mockPrisma as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMinimaxClient();
  });

  // ============================================
  // 圆桌创建测试
  // ============================================

  describe('createRound', () => {
    it('应该创建圆桌并返回圆桌信息', async () => {
      // Arrange
      const topic = createMockTopic({ id: 'topic-1', title: 'AI与职业' });
      const user = createMockUser({ id: 'user-1' });

      mockPrisma.topic.findUnique.mockResolvedValue(topic);
      mockPrisma.round.create.mockImplementation((opts: any) => ({
        id: 'round-1',
        ...opts.data,
        topicId: topic.id,
        topic,
        participants: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const round = await service.createRound({
        topicId: 'topic-1',
        name: 'AI是否会改变职业发展？',
        hostId: 'user-1',
      });

      // Assert
      expect(round).toBeDefined();
      expect(round.id).toBe('round-1');
      expect(round.name).toBe('AI是否会改变职业发展？');
      expect(mockPrisma.round.create).toHaveBeenCalled();
    });

    it('当话题不存在时应抛出错误', async () => {
      // Arrange
      mockPrisma.topic.findUnique.mockResolvedValue(null);

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
  // 加入圆桌测试
  // ============================================

  describe('joinRound', () => {
    it('用户成功加入圆桌', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', status: 'waiting' });
      const user = createMockUser({ id: 'user-2' });

      // 直接 mock 返回带 participants 的数据
      mockPrisma.round.findUnique.mockResolvedValue({
        ...round,
        participants: [{ id: 'p1', roundId: 'round-1', userId: 'user-1', role: 'host', joinedAt: new Date() }],
      });
      mockPrisma.roundUser.create.mockImplementation((opts: any) => ({
        id: 'participant-1',
        roundId: round.id,
        userId: user.id,
        ...opts.data,
      }));

      // Act
      const participant = await service.joinRound('round-1', user.id);

      // Assert
      expect(participant).toBeDefined();
      expect(participant.userId).toBe(user.id);
      expect(mockPrisma.roundUser.create).toHaveBeenCalled();
    });

    it('圆桌已满时应拒绝加入', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', status: 'waiting', maxAgents: 2 });
      const participants = [
        createMockParticipant({ userId: 'user-1' }),
        createMockParticipant({ userId: 'user-2' }),
      ];

      mockPrisma.round.findUnique.mockResolvedValue({
        ...round,
        participants,
      });
      mockPrisma.roundUser.findMany.mockResolvedValue(participants);

      // Act & Assert
      await expect(
        service.joinRound('round-1', 'user-3')
      ).rejects.toThrow('圆桌已满');
    });

    it('已开始的圆桌应拒绝加入', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', status: 'ongoing' });

      mockPrisma.round.findUnique.mockResolvedValue(round);

      // Act & Assert
      await expect(
        service.joinRound('round-1', 'user-2')
      ).rejects.toThrow('圆桌已开始');
    });
  });

  // ============================================
  // 发送消息测试
  // ============================================

  describe('sendMessage', () => {
    it('用户成功发送消息', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', status: 'ongoing' });
      const user = createMockUser({ id: 'user-1' });
      const agent = createMockAgent({ id: 'agent-1', userId: 'user-1' });

      mockPrisma.round.findUnique.mockResolvedValue(round);
      mockPrisma.roundUser.findMany.mockResolvedValue([
        createMockParticipant({ userId: 'user-1' }),
      ]);
      mockPrisma.message.create.mockImplementation((opts: any) => ({
        id: 'msg-1',
        ...opts.data,
        createdAt: new Date(),
      }));

      // Act
      const message = await service.sendMessage({
        roundId: 'round-1',
        userId: 'user-1',
        content: '大家好，我来分享一些观点',
      });

      // Assert
      expect(message).toBeDefined();
      expect(message.content).toBe('大家好，我来分享一些观点');
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('非参与者应被拒绝发送消息', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', status: 'ongoing' });

      mockPrisma.round.findUnique.mockResolvedValue(round);
      mockPrisma.roundUser.findMany.mockResolvedValue([]);

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
  // 获取消息历史测试
  // ============================================

  describe('getMessages', () => {
    it('应返回圆桌消息历史', async () => {
      // Arrange
      const messages = [
        createMockMessage({ id: 'msg-1', content: '消息1' }),
        createMockMessage({ id: 'msg-2', content: '消息2' }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(messages);

      // Act
      const result = await service.getMessages('round-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('消息1');
    });
  });

  // ============================================
  // Agent 自动回复测试
  // ============================================

  describe('agentReply', () => {
    it('Agent 应自动生成回复', async () => {
      // Arrange
      const round = createMockRound({ id: 'round-1', name: 'AI与未来教育' });
      const agent = createMockAgent({ id: 'agent-1', userId: 'user-1' });
      const messages = [
        createMockMessage({ id: 'msg-1', content: '我认为AI会改变教育' }),
      ];

      mockPrisma.round.findUnique.mockResolvedValue(round);
      mockPrisma.message.findMany.mockResolvedValue(messages);

      // Mock Minimax 返回
      mockMinimaxClient.chat.mockResolvedValue('这是一个很有趣的观点...');

      mockPrisma.message.create.mockImplementation((opts: any) => ({
        id: 'msg-agent-1',
        ...opts.data,
        createdAt: new Date(),
      }));

      // Act
      const reply = await service.generateAgentReply(round.id, agent);

      // Assert
      expect(reply).toBeDefined();
      expect(mockMinimaxClient.chat).toHaveBeenCalled();
    });
  });
});

// ============================================
// 辅助函数
// ============================================

function createMockRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-123',
    topicId: 'topic-456',
    name: '测试圆桌',
    description: '测试描述',
    maxAgents: 5,
    status: 'waiting',
    summary: null,
    insights: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Round;
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'user@example.com',
    name: '测试用户',
    avatar: null,
    secondmeId: 'secondme-123',
    interests: ['AI', '教育'],
    connectionTypes: ['cofounder', 'peer'],
    allowAgentAutoJoin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function createMockTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-123',
    title: 'AI与未来',
    description: '讨论AI对未来的影响',
    category: 'technology',
    tags: ['AI', '未来'],
    zhihuId: null,
    zhihuUrl: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Topic;
}

function createMockParticipant(overrides: Partial<RoundParticipant> = {}): RoundParticipant {
  return {
    id: 'participant-1',
    roundId: 'round-123',
    userId: 'user-123',
    role: 'participant',
    joinedAt: new Date(),
    leftAt: null,
    ...overrides,
  } as RoundParticipant;
}

function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-123',
    roundId: 'round-123',
    agentId: 'agent-123',
    content: '测试消息',
    type: 'text',
    metadata: null,
    replyTo: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Message;
}

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-123',
    userId: 'user-123',
    name: '测试Agent',
    personality: '友好、理性',
    expertise: ['AI', '教育'],
    tone: 'friendly',
    isActive: true,
    lastActive: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Agent;
}
