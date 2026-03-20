/**
 * [INPUT]: 依赖 vitest, @/lib/supabase/client
 * [OUTPUT]: ReputationService 单元测试
 * [POS]: lib/user/__tests__/reputation.test.ts - 信誉服务测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReputationService, resetReputationService } from '../reputation';

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
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

function clearMockChains() {
  Object.keys(mockChain).forEach(key => delete mockChain[key]);
}

describe('ReputationService', () => {
  let reputationService: ReputationService;

  beforeEach(() => {
    resetReputationService();
    vi.clearAllMocks();
    clearMockChains();
    reputationService = new ReputationService();
  });

  // ============================================
  // calculateReputation
  // ============================================

  describe('calculateReputation', () => {
    it('应返回用户信誉评分', async () => {
      // Arrange - 设置 mock 数据
      const mockMatches = [
        { id: 'match-1', user_a_id: 'user-1', user_b_id: 'user-2', overall_score: 85, status: 'accepted' },
      ];

      const mockRounds = [
        { id: 'round-1', status: 'completed' },
      ];

      const mockAuditLogs = [
        { action: 'round.joined', timestamp: '2024-01-15T10:00:00Z' },
        { action: 'round.completed', timestamp: '2024-01-15T11:00:00Z' },
      ];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ round_id: 'round-1' }], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
      });

      // Act
      const result = await reputationService.calculateReputation('user-1');

      // Assert
      expect(result.userId).toBe('user-1');
      expect(result.scores).toBeDefined();
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      expect(result.scores.overall).toBeLessThanOrEqual(100);
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('新用户应返回零信誉评分', async () => {
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

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await reputationService.calculateReputation('new-user');

      // Assert
      expect(result.scores.expertise).toBe(0);
      expect(result.scores.collaboration).toBe(0);
    });

    it('应生成技能标签', async () => {
      // Arrange - 设置高分用户数据
      const mockMatches = Array(15).fill(null).map((_, i) => ({
        id: `match-${i}`,
        user_a_id: 'user-1',
        user_b_id: 'user-2',
        overall_score: 90,
        status: 'accepted',
      }));

      const mockRounds = [
        { id: 'round-1', status: 'completed' },
      ];

      const mockAuditLogs = [
        { action: 'round.joined', timestamp: '2024-01-15T10:00:00Z' },
        { action: 'round.completed', timestamp: '2024-01-15T11:00:00Z' },
        { action: 'cotrial.completed', timestamp: '2024-01-15T12:00:00Z' },
      ];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ round_id: 'round-1' }], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
      });

      // Act
      const result = await reputationService.calculateReputation('user-1');

      // Assert
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.totalMatches).toBe(15);
    });
  });

  // ============================================
  // getReputationHistory
  // ============================================

  describe('getReputationHistory', () => {
    it('应返回信誉历史变化', async () => {
      // Arrange
      const mockAuditLogs = [
        { action: 'round.completed', timestamp: '2024-01-15T10:00:00Z' },
        { action: 'match.accepted', timestamp: '2024-01-16T10:00:00Z' },
        { action: 'round.left', timestamp: '2024-01-17T10:00:00Z' },
      ];

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
      });

      // Act
      const result = await reputationService.getReputationHistory('user-1', 30);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it('无历史记录时应返回空数组', async () => {
      // Arrange
      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await reputationService.getReputationHistory('user-no-history');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // 评分计算逻辑
  // ============================================

  describe('评分计算逻辑', () => {
    it('应正确计算完成率', async () => {
      // Arrange - 部分完成的匹配
      const mockMatches = [
        { id: 'match-1', status: 'accepted' },
        { id: 'match-2', status: 'pending' }, // 未完成
        { id: 'match-3', status: 'completed' },
      ];

      const mockRounds = [
        { id: 'round-1', status: 'completed' },
        { id: 'round-2', status: 'active' }, // 未完成
      ];

      setupMockChain('matches', {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      });

      setupMockChain('round_participants', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ round_id: 'round-1' }, { round_id: 'round-2' }], error: null }),
      });

      setupMockChain('rounds', {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await reputationService.calculateReputation('user-1');

      // Assert - 完成率应为 3/5 = 60%
      expect(result.scores.completionRate).toBe(60);
    });

    it('应正确计算协作评分', async () => {
      // Arrange - 正面行为多
      const mockMatches: any[] = [];
      const mockRounds: any[] = [];

      const mockAuditLogs = [
        { action: 'round.joined' },
        { action: 'round.joined' },
        { action: 'round.completed' },
        { action: 'match.accepted' },
        { action: 'cotrial.completed' },
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
        in: vi.fn().mockResolvedValue({ data: mockRounds, error: null }),
      });

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
      });

      // Act
      const result = await reputationService.calculateReputation('user-1');

      // Assert - 100% 正面行为
      expect(result.scores.collaboration).toBe(100);
    });
  });
});
