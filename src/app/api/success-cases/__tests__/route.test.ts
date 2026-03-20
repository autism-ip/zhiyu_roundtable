/**
 * [INPUT]: 依赖 @/app/api/success-cases/route
 * [OUTPUT]: 对外提供成功案例 API 的单元测试
 * [POS]: src/app/api/success-cases/__tests__/route.test.ts - 成功案例路由测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }),
  },
}));

describe('GET /api/success-cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应返回成功响应格式', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    const mockData = [
      {
        id: 'cotrial-1',
        result: '成功完成项目A',
        task_type: 'co_collaboration',
        task_description: '共同开发一个产品',
        completed_at: '2024-01-15T10:00:00Z',
        debate: {
          id: 'debate-1',
          relationship_suggestion: 'cofounder',
          match: {
            id: 'match-1',
            user_a: { name: '用户A', avatar_url: null },
            user_b: { name: '用户B', avatar_url: null },
          },
        },
      },
    ];

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/success-cases'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('应正确格式化案例数据', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    const mockData = [
      {
        id: 'cotrial-1',
        result: '成功完成项目A',
        task_type: 'co_collaboration',
        task_description: '共同开发一个产品',
        completed_at: '2024-01-15T10:00:00Z',
        debate: {
          id: 'debate-1',
          relationship_suggestion: 'cofounder',
          match: {
            id: 'match-1',
            user_a: { name: '用户A', avatar_url: 'http://example.com/avatar1.png' },
            user_b: { name: '用户B', avatar_url: null },
          },
        },
      },
    ];

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/success-cases'));
    const body = await response.json();

    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).toHaveProperty('title');
    expect(body.data[0]).toHaveProperty('description');
    expect(body.data[0]).toHaveProperty('participants');
    expect(body.data[0]).toHaveProperty('outcome');
    expect(body.data[0].title).toBe('共同开发一个产品');
    expect(body.data[0].description).toBe('成功完成项目A');
    expect(body.data[0].outcome).toBe('cofounder');
    expect(body.data[0].participants).toHaveLength(2);
    expect(body.data[0].participants[0].name).toBe('用户A');
  });

  it('数据库错误时应返回错误响应', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/success-cases'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('DATABASE_ERROR');
  });

  it('空数据时应返回空数组', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/success-cases'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('缺失用户数据时应过滤掉null参与者', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    const mockData = [
      {
        id: 'cotrial-1',
        result: '成功完成项目A',
        task_type: 'co_collaboration',
        task_description: '共同开发一个产品',
        completed_at: '2024-01-15T10:00:00Z',
        debate: {
          id: 'debate-1',
          relationship_suggestion: 'cofounder',
          match: {
            id: 'match-1',
            user_a: null,
            user_b: { name: '用户B', avatar_url: null },
          },
        },
      },
    ];

    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost:3000/api/success-cases'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0].participants).toHaveLength(1);
    expect(body.data[0].participants[0].name).toBe('用户B');
  });
});
