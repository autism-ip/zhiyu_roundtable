/**
 * 话题 Seed API 测试
 * [INPUT]: 依赖 TopicService
 * [OUTPUT]: 测试 Seed API
 * [POS]: app/api/topics/seed/route.test.ts - 话题 Seed API 测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mock TopicService
// ============================================

const mockTopicService = {
  createTopic: vi.fn(),
};

vi.mock('@/lib/topic/topic-service', () => ({
  getTopicService: vi.fn().mockReturnValue(mockTopicService),
}));

// ============================================
// 辅助函数
// ============================================

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

describe('GET /api/topics/seed', () => {
  it('应该返回种子数据预览', async () => {
    const { GET } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('topics');
    expect(Array.isArray(data.data.topics)).toBe(true);
    expect(data.data.topics.length).toBe(8);
  });

  it('应该包含正确的话题结构', async () => {
    const { GET } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    const firstTopic = data.data.topics[0];
    expect(firstTopic).toHaveProperty('title');
    expect(firstTopic).toHaveProperty('description');
    expect(firstTopic).toHaveProperty('category');
    expect(firstTopic).toHaveProperty('tags');
    expect(Array.isArray(firstTopic.tags)).toBe(true);
  });

  it('应该返回话题数量信息', async () => {
    const { GET } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveProperty('count');
    expect(data.data.count).toBe(8);
  });
});

describe('POST /api/topics/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认成功创建
    mockTopicService.createTopic.mockResolvedValue({
      id: 'seed-topic-1',
      title: 'Test Topic',
      description: 'Test Description',
      category: 'Test',
      tags: ['test'],
      status: 'active',
      created_at: new Date().toISOString(),
    });
  });

  it('应该成功初始化种子数据', async () => {
    const { POST } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.seedCount).toBe(8); // 8 个种子话题
  });

  it('应该返回创建的话题列表', async () => {
    const { POST } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('seedCount');
    expect(data.data).toHaveProperty('topics');
    expect(Array.isArray(data.data.topics)).toBe(true);
    expect(data.data.topics.length).toBe(8);
  });

  it('应该调用 TopicService.createTopic 8次', async () => {
    const { POST } = await import('./route');
    const request = createMockRequest('http://localhost:3000/api/topics/seed', {
      method: 'POST',
    });

    await POST(request);

    expect(mockTopicService.createTopic).toHaveBeenCalledTimes(8);
  });
});
