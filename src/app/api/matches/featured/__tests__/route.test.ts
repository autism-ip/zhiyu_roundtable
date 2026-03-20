/**
 * [INPUT]: 依赖 @/app/api/matches/featured/route
 * [OUTPUT]: 对外提供推荐知遇卡 API 的单元测试
 * [POS]: src/app/api/matches/featured/__tests__/route.test.ts - 推荐知遇卡路由测试
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

vi.mock('@/lib/match/match-service', () => ({
  getMatchService: vi.fn(() => ({
    getMatchesByRound: vi.fn(),
    getMatchesByUser: vi.fn(),
  })),
}));

describe('GET /api/matches/featured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应返回成功响应格式', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    const mockData = [
      {
        id: 'match-1',
        overall_score: 85,
        relationship_type: 'cofounder',
        match_reason: '技能互补',
        user_a: { name: '用户A', avatar_url: null },
        user_b: { name: '用户B', avatar_url: null },
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
    const response = await GET(new Request('http://localhost:3000/api/matches/featured'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('应正确格式化匹配数据', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    const mockData = [
      {
        id: 'match-1',
        overall_score: 85,
        relationship_type: 'cofounder',
        match_reason: '技能互补',
        user_a: { name: '用户A', avatar_url: 'http://example.com/avatar1.png' },
        user_b: { name: '用户B', avatar_url: null },
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
    const response = await GET(new Request('http://localhost:3000/api/matches/featured'));
    const body = await response.json();

    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).toHaveProperty('user_a');
    expect(body.data[0]).toHaveProperty('user_b');
    expect(body.data[0]).toHaveProperty('overall_score');
    expect(body.data[0]).toHaveProperty('relationship_type');
    expect(body.data[0]).toHaveProperty('match_reason');
    expect(body.data[0].user_a.name).toBe('用户A');
    expect(body.data[0].user_b.name).toBe('用户B');
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
    const response = await GET(new Request('http://localhost:3000/api/matches/featured'));
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
    const response = await GET(new Request('http://localhost:3000/api/matches/featured'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });
});
