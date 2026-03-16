/**
 * [INPUT]: 依赖 vitest 和 rounds API route
 * [OUTPUT]: 对外提供圆桌 API 路由的 TDD 测试
 * [POS]: tests/api/rounds.test.ts - 圆桌 API 单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

// Mock RoundService
const mockRoundService = {
  createRound: vi.fn(),
  getRound: vi.fn(),
  listRounds: vi.fn(),
  joinRound: vi.fn(),
  leaveRound: vi.fn(),
  startRound: vi.fn(),
  completeRound: vi.fn(),
  sendMessage: vi.fn(),
  getMessages: vi.fn(),
};

vi.mock('@/lib/round/round-service', () => ({
  getRoundService: vi.fn().mockReturnValue(mockRoundService),
}));

// Mock AuditLogger
const mockAuditLogger = {
  logRoundAction: vi.fn(),
  log: vi.fn(),
};

vi.mock('@/lib/audit/logger', () => ({
  getAuditLogger: vi.fn().mockReturnValue(mockAuditLogger),
}));

// 辅助函数：创建模拟 NextRequest
function createMockRequest(url: string, options: RequestInit = {}) {
  const urlObj = new URL(url);
  return {
    nextUrl: urlObj,
    url: url,
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
    async json() {
      return options.body ? JSON.parse(options.body as string) : {};
    },
  } as any;
}

describe('Rounds API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // GET /api/rounds - 获取圆桌列表
  // ============================================

  describe('GET /api/rounds', () => {
    it('应返回圆桌列表', async () => {
      // Arrange
      const mockRounds = [
        { id: 'round-1', name: 'AI 讨论', status: 'waiting' },
        { id: 'round-2', name: '产品设计', status: 'ongoing' },
      ];

      mockRoundService.listRounds.mockResolvedValue({
        rounds: mockRounds,
        total: 2,
      });

      // Act
      const { GET } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds');
      const response = await GET(request);

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRounds);
      expect(data.meta.total).toBe(2);
    });

    it('应支持状态过滤', async () => {
      // Arrange
      mockRoundService.listRounds.mockResolvedValue({
        rounds: [{ id: 'round-1', status: 'ongoing' }],
        total: 1,
      });

      // Act
      const { GET } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds?status=ongoing');
      const response = await GET(request);

      // Assert
      expect(mockRoundService.listRounds).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ongoing' })
      );
    });

    it('应支持分页参数', async () => {
      // Arrange
      mockRoundService.listRounds.mockResolvedValue({
        rounds: [],
        total: 0,
      });

      // Act
      const { GET } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds?limit=10&offset=5');
      const response = await GET(request);

      // Assert
      expect(mockRoundService.listRounds).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 5 })
      );
    });
  });

  // ============================================
  // POST /api/rounds - 创建圆桌
  // ============================================

  describe('POST /api/rounds', () => {
    it('应创建新圆桌', async () => {
      // Arrange
      const mockRound = {
        id: 'round-1',
        name: 'AI 未来',
        topicId: 'topic-1',
        status: 'waiting',
        hostId: 'user-1',
      };

      mockRoundService.createRound.mockResolvedValue(mockRound);
      mockAuditLogger.logRoundAction.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-1',
          name: 'AI 未来',
          description: '讨论 AI 的未来发展',
        }),
      });

      const response = await POST(request);

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRound);
      expect(mockRoundService.createRound).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: 'topic-1',
          name: 'AI 未来',
          hostId: 'user-1',
        })
      );
    });

    it('未登录时应返回 401', async () => {
      // Arrange
      vi.mocked(mockRoundService.createRound).mockReset();

      // Act
      const { POST } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-1',
          name: 'Test',
        }),
      });

      // 模拟未登录
      const originalGetServerSession = vi.fn().mockResolvedValue(null);
      vi.mocked(await import('next-auth')).getServerSession = originalGetServerSession;

      const response = await POST(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it('话题不存在时应返回 404', async () => {
      // Arrange
      mockRoundService.createRound.mockRejectedValue(new Error('话题不存在'));

      // Act
      const { POST } = await import('@/app/api/rounds/route');
      const request = createMockRequest('http://localhost/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'invalid-topic',
          name: 'Test',
        }),
      });

      const response = await POST(request);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // GET /api/rounds/[id] - 获取圆桌详情
  // ============================================

  describe('GET /api/rounds/[id]', () => {
    it('应返回圆桌详情', async () => {
      // Arrange
      const mockRound = {
        id: 'round-1',
        name: 'AI 讨论',
        topic: { id: 'topic-1', title: 'AI 未来' },
        participants: [],
        messages: [],
      };

      mockRoundService.getRound.mockResolvedValue(mockRound);

      // Act
      const { GET } = await import('@/app/api/rounds/[id]/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRound);
    });

    it('圆桌不存在时应返回 404', async () => {
      // Arrange
      mockRoundService.getRound.mockResolvedValue(null);

      // Act
      const { GET } = await import('@/app/api/rounds/[id]/route');
      const request = createMockRequest('http://localhost/api/rounds/invalid');
      const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // POST /api/rounds/[id]/join - 加入圆桌
  // ============================================

  describe('POST /api/rounds/[id]/join', () => {
    it('应让用户加入圆桌', async () => {
      // Arrange
      const mockParticipant = {
        id: 'participant-1',
        roundId: 'round-1',
        userId: 'user-2',
        role: 'participant',
      };

      mockRoundService.joinRound.mockResolvedValue(mockParticipant);
      mockAuditLogger.logRoundAction.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockParticipant);
    });

    it('圆桌已满时应返回 409', async () => {
      // Arrange
      mockRoundService.joinRound.mockRejectedValue(new Error('圆桌已满'));

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  // ============================================
  // POST /api/rounds/[id]/messages - 发送消息
  // ============================================

  describe('POST /api/rounds/[id]/messages', () => {
    it('应发送消息', async () => {
      // Arrange
      const mockMessage = {
        id: 'message-1',
        roundId: 'round-1',
        agentId: 'agent-1',
        content: '你好！',
        type: 'text',
      };

      mockRoundService.sendMessage.mockResolvedValue(mockMessage);
      mockAuditLogger.log.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/messages/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          content: '你好！',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMessage);
    });

    it('不是参与者时应返回 403', async () => {
      // Arrange
      mockRoundService.sendMessage.mockRejectedValue(new Error('不是圆桌参与者'));

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/messages/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-2',
          content: '你好！',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // GET /api/rounds/[id]/messages - 获取消息列表
  // ============================================

  describe('GET /api/rounds/[id]/messages', () => {
    it('应返回消息列表', async () => {
      // Arrange
      const mockMessages = [
        { id: 'message-1', content: '你好' },
        { id: 'message-2', content: '大家好' },
      ];

      mockRoundService.getMessages.mockResolvedValue(mockMessages);

      // Act
      const { GET } = await import('@/app/api/rounds/[id]/messages/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/messages');
      const response = await GET(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMessages);
    });
  });

  // ============================================
  // POST /api/rounds/[id]/start - 开始圆桌
  // ============================================

  describe('POST /api/rounds/[id]/start', () => {
    it('应开始圆桌', async () => {
      // Arrange
      const mockRound = {
        id: 'round-1',
        status: 'ongoing',
        participants: [],
      };

      mockRoundService.startRound.mockResolvedValue(mockRound);
      mockAuditLogger.logRoundAction.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/start/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/start', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('ongoing');
    });
  });

  // ============================================
  // POST /api/rounds/[id]/complete - 结束圆桌
  // ============================================

  describe('POST /api/rounds/[id]/complete', () => {
    it('应结束圆桌', async () => {
      // Arrange
      const mockRound = {
        id: 'round-1',
        status: 'completed',
        summary: '讨论总结',
      };

      mockRoundService.completeRound.mockResolvedValue(mockRound);
      mockAuditLogger.logRoundAction.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/complete/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: '讨论总结' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
    });
  });

  // ============================================
  // POST /api/rounds/[id]/leave - 离开圆桌
  // ============================================

  describe('POST /api/rounds/[id]/leave', () => {
    it('应让用户离开圆桌', async () => {
      // Arrange
      mockRoundService.leaveRound.mockResolvedValue(undefined);
      mockAuditLogger.logRoundAction.mockResolvedValue({});

      // Act
      const { POST } = await import('@/app/api/rounds/[id]/leave/route');
      const request = createMockRequest('http://localhost/api/rounds/round-1/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });

      // Assert
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockRoundService.leaveRound).toHaveBeenCalledWith('round-1', 'user-1');
    });
  });
});
