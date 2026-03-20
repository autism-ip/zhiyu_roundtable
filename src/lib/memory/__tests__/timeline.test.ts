/**
 * [INPUT]: 依赖 vitest, @/lib/supabase/client
 * [OUTPUT]: TimelineService 单元测试
 * [POS]: lib/memory/__tests__/timeline.test.ts - 时间线服务测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineService, resetTimelineService, getTimelineService } from '../timeline';

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
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  chain.select.mockReturnThis();
  return chain;
}

function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

function clearMockChains() {
  Object.keys(mockChain).forEach(key => delete mockChain[key]);
}

describe('TimelineService', () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    resetTimelineService();
    vi.clearAllMocks();
    clearMockChains();
    timelineService = new TimelineService();
  });

  // ============================================
  // getUserTimeline
  // ============================================

  describe('getUserTimeline', () => {
    it('应返回用户的时间线事件', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          timestamp: '2024-01-15T10:00:00Z',
          action: 'round.created',
          actor_type: 'user',
          actor_id: 'user-1',
          resource_type: 'round',
          resource_id: 'round-1',
          context_before: {},
          context_after: { name: 'Test Round' },
          metadata: {},
        },
        {
          id: 'event-2',
          timestamp: '2024-01-15T11:00:00Z',
          action: 'match.generated',
          actor_type: 'user',
          actor_id: 'user-1',
          resource_type: 'match',
          resource_id: 'match-1',
          context_before: {},
          context_after: { score: 85 },
          metadata: {},
        },
      ];

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      });

      // Act
      const result = await timelineService.getUserTimeline('user-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event-1');
      expect(result[0].action).toBe('round.created');
    });

    it('用户无事件时应返回空数组', async () => {
      // Arrange
      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Act
      const result = await timelineService.getUserTimeline('user-no-events');

      // Assert
      expect(result).toEqual([]);
    });

    it('查询失败时应抛出错误', async () => {
      // Arrange
      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      // Act & Assert
      await expect(timelineService.getUserTimeline('user-1')).rejects.toThrow('获取用户时间线失败');
    });
  });

  // ============================================
  // getResourceTimeline
  // ============================================

  describe('getResourceTimeline', () => {
    it('应返回资源的时间线事件', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          timestamp: '2024-01-15T10:00:00Z',
          action: 'round.started',
          actor_type: 'user',
          actor_id: 'user-1',
          resource_type: 'round',
          resource_id: 'round-1',
          context_before: {},
          context_after: { status: 'active' },
          metadata: {},
        },
      ];

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      });

      // Act
      const result = await timelineService.getResourceTimeline('round', 'round-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].resource.id).toBe('round-1');
    });
  });

  // ============================================
  // getRecentActivity
  // ============================================

  describe('getRecentActivity', () => {
    it('应返回最近的聚合活动', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          timestamp: '2024-01-15T10:00:00Z',
          action: 'round.created',
          actor_type: 'user',
          actor_id: 'user-1',
          resource_type: 'round',
          resource_id: 'round-1',
          context_before: {},
          context_after: {},
          metadata: {},
        },
      ];

      const chain: any = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };
      setupMockChain('audit_logs', chain);

      // Act
      const result = await timelineService.getRecentActivity('user-1', 5);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  // ============================================
  // formatTimelineEvent
  // ============================================

  describe('formatTimelineEvent', () => {
    it('应正确格式化事件为时间线展示格式', async () => {
      // Arrange
      const rawEvent = {
        id: 'event-1',
        timestamp: '2024-01-15T10:00:00Z',
        action: 'round.created',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'round',
        resource_id: 'round-1',
        context_before: {},
        context_after: { name: 'Test Round' },
        metadata: {},
      };

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [rawEvent], error: null }),
      });

      // Act
      const result = await timelineService.getUserTimeline('user-1');

      // Assert
      expect(result[0].summary).toBe('创建了圆桌');
      expect(result[0].actor.type).toBe('user');
      expect(result[0].resource.type).toBe('round');
      expect(result[0].resource.name).toBe('Test Round');
    });

    it('应处理未知的动作类型', async () => {
      // Arrange
      const rawEvent = {
        id: 'event-1',
        timestamp: '2024-01-15T10:00:00Z',
        action: 'unknown.action',
        actor_type: 'agent',
        actor_id: 'agent-1',
        resource_type: 'test',
        resource_id: 'test-1',
        context_before: {},
        context_after: {},
        metadata: {},
      };

      setupMockChain('audit_logs', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [rawEvent], error: null }),
      });

      // Act
      const result = await timelineService.getUserTimeline('user-1');

      // Assert
      expect(result[0].summary).toContain('Agent');
      expect(result[0].summary).toContain('unknown.action');
    });
  });

  // ============================================
  // singleton behavior
  // ============================================

  describe('getTimelineService', () => {
    it('应返回单例', () => {
      resetTimelineService();
      const instance1 = getTimelineService();
      const instance2 = getTimelineService();
      expect(instance1).toBe(instance2);
    });
  });
});
