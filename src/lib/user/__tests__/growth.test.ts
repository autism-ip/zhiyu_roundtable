/**
 * [INPUT]: 依赖 vitest, @/lib/supabase/client
 * [OUTPUT]: GrowthService 单元测试
 * [POS]: lib/user/__tests__/growth.test.ts - 成长服务测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowthService, resetGrowthService } from '../growth';

// ============================================
// Mock Supabase Chainable Pattern
// ============================================

const mockChain: Record<string, any> = {};

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      return mockChain[table] || createDefaultChain(table);
    }),
  },
}));

function createDefaultChain(_table: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function(field: string, value: any) {
      // Chainable - returns this for method chaining
      return this;
    }),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

function clearMockChains() {
  Object.keys(mockChain).forEach(key => delete mockChain[key]);
}

describe('GrowthService', () => {
  let growthService: GrowthService;

  beforeEach(() => {
    resetGrowthService();
    vi.clearAllMocks();
    clearMockChains();
    growthService = new GrowthService();
  });

  // ============================================
  // getUserGrowth
  // ============================================

  describe('getUserGrowth', () => {
    it('应返回用户成长数据', async () => {
      // Arrange
      const mockMatches = [
        { id: 'match-1', user_a_id: 'user-1', status: 'accepted' },
      ];

      const mockRounds = [
        { id: 'round-1', status: 'completed', joined_at: '2024-01-15T10:00:00Z' },
      ];

      const mockDebates: any[] = [];
      const mockCotrials: any[] = [];
      const mockUnlockedAchievements: any[] = [];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ round_id: 'round-1', joined_at: '2024-01-15T10:00:00Z' }], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockDebates, error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockCotrials, error: null }),
      });

      setupMockChain('user_achievements', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockUnlockedAchievements, error: null }),
      });

      // Act
      const result = await growthService.getUserGrowth('user-1');

      // Assert
      expect(result.userId).toBe('user-1');
      expect(result.points).toBeDefined();
      expect(result.level).toBeGreaterThan(0);
      expect(result.achievements).toBeDefined();
      expect(Array.isArray(result.achievements)).toBe(true);
    });

    it('新用户应有零积分', async () => {
      // Arrange
      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('user_achievements', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await growthService.getUserGrowth('new-user');

      // Assert
      expect(result.points.total).toBe(0);
      expect(result.level).toBe(1);
    });
  });

  // ============================================
  // calculatePoints
  // ============================================

  describe('calculatePoints', () => {
    it('应正确计算圆桌积分', async () => {
      // Arrange - 参加2次圆桌，1次完成
      const mockRounds = [
        { id: 'round-1', status: 'active', joined_at: '2024-01-15T10:00:00Z' },
        { id: 'round-2', status: 'completed', joined_at: '2024-01-16T10:00:00Z' },
      ];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { round_id: 'round-1', joined_at: '2024-01-15T10:00:00Z' },
            { round_id: 'round-2', joined_at: '2024-01-16T10:00:00Z' },
          ],
          error: null,
        }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await growthService.calculatePoints('user-1');

      // Assert
      // 2次加入 * 5分 + 1次完成 * 15分 = 10 + 15 = 25
      expect(result.roundPoints).toBe(25);
    });

    it('应正确计算知遇积分', async () => {
      // Arrange - 1个生成，1个接受
      const mockMatches = [
        { id: 'match-1', status: 'pending' },
        { id: 'match-2', status: 'accepted' },
      ];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await growthService.calculatePoints('user-1');

      // Assert
      // 2个生成 * 10分 + 1个接受 * 20分 = 20 + 20 = 40
      expect(result.matchPoints).toBe(40);
    });
  });

  // ============================================
  // unlockAchievement
  // ============================================

  describe('unlockAchievement', () => {
    it('应成功解锁新成就', async () => {
      // Arrange - 创建正确的链式 mock
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(function(this: any, field: string, value: any) {
          return this;
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'ua-1' }, error: null }),
      };
      setupMockChain('user_achievements', chain);

      // Act
      const result = await growthService.unlockAchievement('user-1', 'round-first');

      // Assert
      expect(result).toBe(true);
    });

    it('已解锁的成就不应重复解锁', async () => {
      // Arrange - 已存在成就
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(function(this: any, field: string, value: any) {
          return this;
        }),
        single: vi.fn().mockResolvedValue({ data: { id: 'ua-1' }, error: null }),
      };
      setupMockChain('user_achievements', chain);

      // Act
      const result = await growthService.unlockAchievement('user-1', 'round-first');

      // Assert
      expect(result).toBe(false);
    });

    it('不存在的成就ID应返回false', async () => {
      // Act
      const result = await growthService.unlockAchievement('user-1', 'non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================
  // 等级计算
  // ============================================

  describe('等级计算', () => {
    it('0分用户应为1级', async () => {
      // Arrange
      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('user_achievements', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await growthService.getUserGrowth('user-1');

      // Assert
      expect(result.level).toBe(1);
      expect(result.levelName).toBe('初出茅庐');
    });

    it('高积分用户应有更高级别', async () => {
      // Arrange - 创建足够多数据以达到更高等级
      const mockMatches = Array(20).fill(null).map((_, i) => ({
        id: `match-${i}`,
        status: 'accepted',
      }));

      const mockRounds = Array(30).fill(null).map((_, i) => ({
        id: `round-${i}`,
        status: i < 15 ? 'completed' : 'active',
        joined_at: '2024-01-15T10:00:00Z',
      }));

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockRounds.map(r => ({ round_id: r.id, joined_at: r.joined_at })),
          error: null,
        }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('debates', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('cotrials', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      setupMockChain('user_achievements', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await growthService.getUserGrowth('user-1');

      // Assert - 30次加入*5 + 15次完成*15 + 20次接受*20 = 150+225+400 = 775 -> 等级8
      expect(result.level).toBeGreaterThan(5);
      expect(result.points.total).toBeGreaterThan(500);
    });
  });
});
