/**
 * [INPUT]: 依赖 vitest 和 AuditLogger
 * [OUTPUT]: 对外提供审计日志的 TDD 测试
 * [POS]: lib/audit/__tests__/logger.test.ts - 审计日志单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger, AuditLoggerConfig, AuditAction, resetAuditLogger } from '../logger';

// ============================================
// Mock Supabase Chainable Pattern
// ============================================

// Store mock implementations per table
const mockChain: Record<string, any> = {};

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      return mockChain[table] || createDefaultChain(table);
    }),
  },
}));

// Helper to create default chain
function createDefaultChain(_table: string) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  };
}

// Helper to setup mock chain for specific table
function setupMockChain(table: string, chain: any) {
  mockChain[table] = chain;
}

// Helper to clear all mocks
function clearMockChains() {
  Object.keys(mockChain).forEach(key => delete mockChain[key]);
}

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    // Reset singleton instance
    resetAuditLogger();
    vi.clearAllMocks();
    clearMockChains();
    logger = new AuditLogger({ enableConsole: false });
  });

  // ============================================
  // Mock audit_logs table helper
  // ============================================

  function setupAuditLogsChain(chain: any) {
    setupMockChain('audit_logs', chain);
  }

  function createInsertChain(data: any, returning: any = null) {
    return {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: returning || { id: 'audit-1', ...data, timestamp: new Date().toISOString() },
        error: null,
      }),
    };
  }

  // ============================================
  // 圆桌操作审计测试
  // ============================================

  describe('round operations', () => {
    it('应记录圆桌创建事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'round.created',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'round',
        resource_id: 'round-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'round.created',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'round', id: 'round-1' },
        context: {
          before: {},
          after: { name: 'AI讨论', topicId: 'topic-1' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'round.created',
          actor_type: 'user',
          actor_id: 'user-1',
          resource_type: 'round',
          resource_id: 'round-1',
        })
      );
    });

    it('应记录用户加入圆桌事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'round.joined',
        actor_type: 'user',
        actor_id: 'user-2',
        resource_type: 'round',
        resource_id: 'round-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'round.joined',
        actor: { type: 'user', id: 'user-2' },
        resource: { type: 'round', id: 'round-1' },
        context: {
          after: { role: 'participant' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'round.joined',
          actor_type: 'user',
          actor_id: 'user-2',
        })
      );
    });

    it('应记录用户离开圆桌事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'round.left',
        actor_type: 'user',
        actor_id: 'user-2',
        resource_type: 'round',
        resource_id: 'round-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'round.left',
        actor: { type: 'user', id: 'user-2' },
        resource: { type: 'round', id: 'round-1' },
        context: {
          before: { role: 'participant', joinedAt: '2024-01-01' },
          after: { leftAt: '2024-01-02' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'round.left',
        })
      );
    });

    it('应记录圆桌完成事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'round.completed',
        actor_type: 'system',
        actor_id: 'system',
        resource_type: 'round',
        resource_id: 'round-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'round.completed',
        actor: { type: 'system', id: 'system' },
        resource: { type: 'round', id: 'round-1' },
        context: {
          before: { status: 'ongoing' },
          after: { status: 'completed', summary: '讨论总结' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalled();
    });
  });

  // ============================================
  // 知遇卡操作审计测试
  // ============================================

  describe('match operations', () => {
    it('应记录知遇卡生成事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'match.generated',
        actor_type: 'agent',
        actor_id: 'bole-agent',
        resource_type: 'match',
        resource_id: 'match-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'match.generated',
        actor: { type: 'agent', id: 'bole-agent' },
        resource: { type: 'match', id: 'match-1' },
        context: {
          after: {
            userAId: 'user-1',
            userBId: 'user-2',
            complementarityScore: 85,
            relationshipType: 'cofounder',
          },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'match.generated',
          resource_type: 'match',
          resource_id: 'match-1',
        })
      );
    });

    it('应记录知遇卡接受事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'match.accepted',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'match',
        resource_id: 'match-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'match.accepted',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'match', id: 'match-1' },
        context: {
          before: { status: 'pending' },
          after: { status: 'accepted' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'match.accepted',
        })
      );
    });

    it('应记录知遇卡拒绝事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'match.declined',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'match',
        resource_id: 'match-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'match.declined',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'match', id: 'match-1' },
        context: {
          before: { status: 'pending' },
          after: { status: 'declined' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'match.declined',
        })
      );
    });
  });

  // ============================================
  // 争鸣层操作审计测试
  // ============================================

  describe('debate operations', () => {
    it('应记录争鸣层发起事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'debate.initiated',
        actor_type: 'system',
        actor_id: 'system',
        resource_type: 'debate',
        resource_id: 'debate-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'debate.initiated',
        actor: { type: 'system', id: 'system' },
        resource: { type: 'debate', id: 'debate-1' },
        context: {
          after: { matchId: 'match-1', questions: ['Q1', 'Q2', 'Q3'] },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'debate.initiated',
          resource_type: 'debate',
        })
      );
    });

    it('应记录争鸣层回答事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'debate.responded',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'debate',
        resource_id: 'debate-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'debate.responded',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'debate', id: 'debate-1' },
        context: {
          after: { questionId: 'q1', response: '我的回答...' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'debate.responded',
        })
      );
    });

    it('应记录争鸣层完成事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'debate.completed',
        actor_type: 'system',
        actor_id: 'system',
        resource_type: 'debate',
        resource_id: 'debate-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'debate.completed',
        actor: { type: 'system', id: 'system' },
        resource: { type: 'debate', id: 'debate-1' },
        context: {
          after: {
            healthScore: 78,
            shouldConnect: true,
            relationshipSuggestion: 'cofounder',
          },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'debate.completed',
        })
      );
    });
  });

  // ============================================
  // 共试层操作审计测试
  // ============================================

  describe('cotrial operations', () => {
    it('应记录共试任务分配事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'cotrial.assigned',
        actor_type: 'system',
        actor_id: 'system',
        resource_type: 'cotrial',
        resource_id: 'cotrial-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'cotrial.assigned',
        actor: { type: 'system', id: 'system' },
        resource: { type: 'cotrial', id: 'cotrial-1' },
        context: {
          after: {
            debateId: 'debate-1',
            taskType: 'co_collaboration',
            duration: '7天',
          },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cotrial.assigned',
        })
      );
    });

    it('应记录共试任务完成事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'cotrial.completed',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'cotrial',
        resource_id: 'cotrial-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'cotrial.completed',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'cotrial', id: 'cotrial-1' },
        context: {
          before: { completed: false },
          after: { completed: true, result: '成功' },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cotrial.completed',
        })
      );
    });

    it('应记录共试任务评价事件', async () => {
      // Arrange
      const chain = createInsertChain({
        action: 'cotrial.rated',
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'cotrial',
        resource_id: 'cotrial-1',
      });
      setupAuditLogsChain(chain);

      // Act
      await logger.log({
        action: 'cotrial.rated',
        actor: { type: 'user', id: 'user-1' },
        resource: { type: 'cotrial', id: 'cotrial-1' },
        context: {
          after: {
            satisfaction: 5,
            comment: '合作愉快',
            wouldContinue: true,
          },
        },
      });

      // Assert
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cotrial.rated',
        })
      );
    });
  });

  // ============================================
  // 查询审计日志测试
  // ============================================

  describe('query operations', () => {
    it('应按资源类型查询审计日志', async () => {
      // Arrange
      const mockLogs = [
        { id: '1', action: 'round.created', resource_type: 'round', resource_id: 'round-1' },
        { id: '2', action: 'round.joined', resource_type: 'round', resource_id: 'round-1' },
      ];

      setupAuditLogsChain({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockLogs, error: null })),
      });

      // Act
      const logs = await logger.query({
        resourceType: 'round',
        resourceId: 'round-1',
      });

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs[0].resource_type).toBe('round');
      expect(logs[0].resource_id).toBe('round-1');
    });

    it('应按时间范围查询审计日志', async () => {
      // Arrange
      setupAuditLogsChain({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      });

      // Act
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');
      const logs = await logger.query({
        startTime,
        endTime,
      });

      // Assert
      expect(logs).toEqual([]);
    });

    it('应按操作者查询审计日志', async () => {
      // Arrange
      setupAuditLogsChain({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      });

      // Act
      const logs = await logger.query({
        actorType: 'user',
        actorId: 'user-1',
      });

      // Assert
      expect(logs).toEqual([]);
    });
  });

  // ============================================
  // 错误处理测试
  // ============================================

  describe('error handling', () => {
    it('当数据库写入失败时应抛出异常', async () => {
      // Arrange
      setupAuditLogsChain({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: '500' },
        }),
      });

      // Act & Assert
      await expect(
        logger.log({
          action: 'round.created',
          actor: { type: 'user', id: 'user-1' },
          resource: { type: 'round', id: 'round-1' },
        })
      ).rejects.toThrow('记录审计日志失败');
    });

    it('应验证必填字段', async () => {
      // Act & Assert - 缺少 action
      await expect(
        // @ts-ignore
        logger.log({
          actor: { type: 'user', id: 'user-1' },
          resource: { type: 'round', id: 'round-1' },
        })
      ).rejects.toThrow('action is required');

      // 缺少 actor
      await expect(
        // @ts-ignore
        logger.log({
          action: 'round.created',
          resource: { type: 'round', id: 'round-1' },
        })
      ).rejects.toThrow('actor is required');

      // 缺少 resource
      await expect(
        // @ts-ignore
        logger.log({
          action: 'round.created',
          actor: { type: 'user', id: 'user-1' },
        })
      ).rejects.toThrow('resource is required');
    });
  });
});
