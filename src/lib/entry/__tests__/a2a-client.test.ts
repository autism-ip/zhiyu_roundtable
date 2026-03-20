/**
 * A2A Client 测试
 * [INPUT]: 依赖 @/lib/entry/a2a-client 的所有导出
 * [OUTPUT]: 对外提供 A2AClient 和 A2AClientManager 的单元测试
 * [POS]: lib/entry/__tests__/a2a-client.test.ts - A2A 协议客户端测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  A2AClient,
  A2AClientManager,
  type AgentCard,
  type A2AMessageRequest,
  type A2AMessageResponse,
  type A2AStreamEvent,
} from '../a2a-client';

// ============================================
// Mock 全局 fetch
// ============================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// 测试数据
// ============================================

const TEST_AGENT_URL = 'https://example-agent.com';
const TEST_MESSAGE_ID = 'test-message-id-123';

const mockAgentCard: AgentCard = {
  name: 'Test Agent',
  description: 'A test agent for A2A protocol',
  url: TEST_AGENT_URL,
  version: '1.0.0',
  provider: {
    organization: 'Test Org',
    contactEmail: 'test@example.com',
  },
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  skills: [
    {
      id: 'skill-1',
      name: 'Test Skill',
      description: 'A test skill',
      inputModes: ['text'],
      outputModes: ['text'],
    },
  ],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
};

// ============================================
// A2AClientManager Tests
// ============================================

describe('A2AClientManager', () => {
  let manager: A2AClientManager;

  beforeEach(() => {
    manager = new A2AClientManager();
    mockFetch.mockReset();
  });

  describe('getClient', () => {
    it('应返回同一客户端实例', async () => {
      // 第一次获取
      const client1 = await manager.getClient(TEST_AGENT_URL);
      // 第二次获取应返回相同实例
      const client2 = await manager.getClient(TEST_AGENT_URL);

      expect(client1).toBe(client2);
      expect(client1).toBeInstanceOf(A2AClient);
    });

    it('不同 URL 应返回不同客户端实例', async () => {
      const client1 = await manager.getClient('https://agent-a.com');
      const client2 = await manager.getClient('https://agent-b.com');

      expect(client1).not.toBe(client2);
    });
  });

  describe('getAgentCard', () => {
    it('应获取并缓存 Agent Card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      });

      // 第一次调用
      const card1 = await manager.getAgentCard(TEST_AGENT_URL);
      // 第二次调用应使用缓存
      const card2 = await manager.getAgentCard(TEST_AGENT_URL);

      expect(card1).toEqual(mockAgentCard);
      expect(card2).toEqual(mockAgentCard);
      // fetch 只应被调用一次（缓存）
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('网络错误应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const card = await manager.getAgentCard(TEST_AGENT_URL);

      expect(card).toBeNull();
    });

    it('HTTP 错误状态应返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const card = await manager.getAgentCard(TEST_AGENT_URL);

      expect(card).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('应发送消息并返回响应文本', async () => {
      const responseData: A2AMessageResponse = {
        messageId: TEST_MESSAGE_ID,
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Hello from agent' }],
        },
        status: 'completed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      const result = await manager.sendMessage(TEST_AGENT_URL, 'Hello');

      expect(result).toBe('Hello from agent');
    });

    it('响应失败时应抛出错误', async () => {
      const responseData: A2AMessageResponse = {
        messageId: TEST_MESSAGE_ID,
        message: { role: 'agent', parts: [] },
        status: 'failed',
        error: 'Agent processing failed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      await expect(manager.sendMessage(TEST_AGENT_URL, 'Hello')).rejects.toThrow(
        'Agent processing failed'
      );
    });
  });

  describe('streamMessage', () => {
    it('应返回 AsyncGenerator', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"message","message":{"role":"agent","parts":[{"type":"text","text":"chunk1"}]}}\n'));
          controller.enqueue(new TextEncoder().encode('data: {"type":"message","message":{"role":"agent","parts":[{"type":"text","text":"chunk2"}]}}\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const generator = manager.streamMessage(TEST_AGENT_URL, 'Hello');

      expect(generator).toBeInstanceOf(Object);
      expect(typeof generator.next).toBe('function');

      const results: string[] = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toEqual(['chunk1', 'chunk2']);
    });
  });

  describe('clearCache', () => {
    it('应清除客户端缓存', async () => {
      // 先获取一个客户端
      await manager.getClient(TEST_AGENT_URL);
      // 验证缓存有数据
      expect((manager as any).clients.size).toBe(1);
      // 清除缓存
      manager.clearCache();
      // 验证缓存已被清除（清除后不再调用 getClient）
      expect((manager as any).clients.size).toBe(0);
      expect((manager as any).agentCards.size).toBe(0);
    });
  });
});

// ============================================
// A2AClient Tests
// ============================================

describe('A2AClient', () => {
  let client: A2AClient;

  beforeEach(() => {
    client = new A2AClient(TEST_AGENT_URL);
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('应设置 agentUrl', () => {
      expect((client as any).agentUrl).toBe(TEST_AGENT_URL);
    });
  });

  describe('sendMessage', () => {
    it('应发送 POST 请求', async () => {
      const request: A2AMessageRequest = {
        messageId: TEST_MESSAGE_ID,
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      };

      const responseData: A2AMessageResponse = {
        messageId: TEST_MESSAGE_ID,
        message: { role: 'agent', parts: [{ type: 'text', text: 'Response' }] },
        status: 'completed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      const result = await client.sendMessage(request);

      expect(mockFetch).toHaveBeenCalledWith(
        TEST_AGENT_URL,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('HTTP 错误应返回 failed 状态', async () => {
      const request: A2AMessageRequest = {
        messageId: TEST_MESSAGE_ID,
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await client.sendMessage(request);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });
  });

  describe('sendMessageStreaming', () => {
    it('应返回 AsyncGenerator', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"message","message":{"role":"agent","parts":[{"type":"text","text":"streaming response"}]}}\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
      });

      const request: A2AMessageRequest = {
        messageId: TEST_MESSAGE_ID,
        message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      };

      const generator = client.sendMessageStreaming(request);

      expect(generator).toBeInstanceOf(Object);
      expect(typeof generator.next).toBe('function');
    });

    it('HTTP 错误应 yield error 事件', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const request: A2AMessageRequest = {
        messageId: TEST_MESSAGE_ID,
        message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      };

      const events: A2AStreamEvent[] = [];
      for await (const event of client.sendMessageStreaming(request)) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect(events[0].error).toContain('HTTP 500');
    });
  });

  describe('getAgentCard', () => {
    it('应获取 Agent Card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      });

      const card = await client.getAgentCard();

      expect(card).toEqual(mockAgentCard);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example-agent.com/.well-known/agent-card.json'
      );
    });

    it('网络错误应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const card = await client.getAgentCard();

      expect(card).toBeNull();
    });

    it('HTTP 错误状态应返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const card = await client.getAgentCard();

      expect(card).toBeNull();
    });
  });
});
