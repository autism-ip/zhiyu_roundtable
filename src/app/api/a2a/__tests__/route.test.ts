/**
 * [INPUT]: 依赖 @/app/api/a2a/route 的 GET/POST 处理器
 * [OUTPUT]: 对外提供 A2A Route Handler 的单元测试
 * [POS]: src/app/api/a2a/__tests__/route.test.ts - A2A 路由测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies using relative paths
vi.mock('@/lib/entry/agent-mode', () => ({
  getAgentModeService: vi.fn(() => ({
    getMode: vi.fn(() => ({ mode: 'agent', autoAction: true })),
  })),
}));

vi.mock('@/lib/entry/a2a-client', () => ({
  getA2AClientManager: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue({ success: true, message: 'Response from agent' }),
  })),
}));

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'secondme_user') {
        return {
          value: encodeURIComponent(JSON.stringify({
            userId: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com',
          })),
        };
      }
      return undefined;
    }),
  })),
}));

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  strictRateLimiter: vi.fn(() => ({
    success: true,
    resetTime: Date.now() + 60000,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
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

describe('GET /api/a2a', () => {
  it('应返回 Agent Card', async () => {
    const { GET } = await import('../route');
    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      name: '知遇圆桌 Agent',
      version: '1.0.0',
    });
  });

  it('Agent Card 应包含 name, version, capabilities', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    // 验证 name 存在
    expect(body).toHaveProperty('name');
    expect(typeof body.name).toBe('string');
    expect(body.name.length).toBeGreaterThan(0);

    // 验证 version 存在
    expect(body).toHaveProperty('version');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);

    // 验证 capabilities 存在
    expect(body).toHaveProperty('capabilities');
    expect(body.capabilities).toHaveProperty('streaming');
    expect(body.capabilities).toHaveProperty('pushNotifications');
  });

  it('Agent Card 应包含 skills 数组', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('skills');
    expect(Array.isArray(body.skills)).toBe(true);
    expect(body.skills.length).toBeGreaterThan(0);

    // 验证每个 skill 有 id 和 name
    body.skills.forEach((skill: { id: string; name: string }) => {
      expect(skill).toHaveProperty('id');
      expect(skill).toHaveProperty('name');
    });
  });
});

describe('POST /api/a2a', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('错误处理', () => {
    it('无效 JSONRPC 版本应返回错误', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0', // 无效版本
          id: 'test-1',
          method: 'agent.getStatus',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32600);
      expect(body.error.message).toBe('Invalid Request');
    });

    it('未知方法应返回 Method not found', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'unknown.method',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32601);
      expect(body.error.message).toContain('Method not found');
    });

    it('解析错误应返回 Parse error', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32700);
      expect(body.error.message).toBe('Parse error');
    });
  });

  describe('agent.analyzeRound', () => {
    it('缺少参数应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.analyzeRound',
          params: {}, // 缺少 roundId 和 content
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
      expect(body.error.message).toContain('Invalid params');
    });

    it('有 roundId 参数应成功调用', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.analyzeRound',
          params: { roundId: 'round-123' },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.analysis).toBeDefined();
    });

    it('有 content 参数应成功调用', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.analyzeRound',
          params: { content: 'some discussion content' },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
    });
  });

  describe('agent.generateMatch', () => {
    it('缺少 userAId 应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.generateMatch',
          params: { userBId: 'user-b' }, // 缺少 userAId
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
    });

    it('缺少 userBId 应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.generateMatch',
          params: { userAId: 'user-a' }, // 缺少 userBId
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
    });

    it('有完整参数应成功调用', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.generateMatch',
          params: { userAId: 'user-a', userBId: 'user-b', roundId: 'round-123' },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.match).toBeDefined();
      expect(body.result.match.userAId).toBe('user-a');
      expect(body.result.match.userBId).toBe('user-b');
    });
  });

  describe('agent.startDebate', () => {
    it('缺少 matchId 参数应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.startDebate',
          params: { scenario: 'some scenario' }, // 缺少 matchId
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
    });

    it('有 matchId 参数应成功调用', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.startDebate',
          params: { matchId: 'match-123', scenario: 'test scenario' },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.debateId).toBeDefined();
    });
  });

  describe('agent.getStatus', () => {
    it('应返回当前模式状态', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent.getStatus',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.mode).toBeDefined();
      expect(body.result.agentCard).toBeDefined();
      expect(body.result.capabilities).toBeDefined();
    });
  });

  describe('agent/send', () => {
    it('缺少 targetAgentUrl 应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent/send',
          params: { content: 'hello' }, // 缺少 targetAgentUrl
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
    });

    it('缺少 content 应返回 Invalid params', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent/send',
          params: { targetAgentUrl: 'http://example.com/agent' }, // 缺少 content
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32602);
    });

    it('有完整参数应成功调用', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'agent/send',
          params: {
            targetAgentUrl: 'http://example.com/agent',
            content: 'hello agent',
            sessionId: 'session-123',
          },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.response).toBeDefined();
    });
  });

  describe('JSONRPC Response 格式', () => {
    it('成功响应应包含 jsonrpc, id, result', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-123',
          method: 'agent.getStatus',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe('test-123');
      expect(body.result).toBeDefined();
    });

    it('错误响应应包含 jsonrpc, id, error', async () => {
      const { POST } = await import('../route');
      const request = createMockRequest('http://localhost:3000/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-456',
          method: 'unknown.method',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe('test-456');
      expect(body.error).toBeDefined();
      expect(body.error.code).toBeDefined();
      expect(body.error.message).toBeDefined();
    });
  });
});
