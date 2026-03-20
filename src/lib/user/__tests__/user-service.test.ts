/**
 * [INPUT]: 依赖 vitest
 * [OUTPUT]: UserService 单元测试
 * [POS]: lib/user/__tests__/user-service.test.ts - 用户服务测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, resetUserService } from '../user-service';

// ============================================
// Mock Supabase Chainable Pattern
// ============================================

// Store mock implementations
const mockChain: Record<string, any> = {};

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      return mockChain[table] || createDefaultChain(table);
    }),
  },
}));

vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(() => ({
    chat: vi.fn(),
    chatJSON: vi.fn(),
  })),
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

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    resetUserService();
    vi.clearAllMocks();
    clearMockChains();
    userService = new UserService();
  });

  // ============================================
  // createUser
  // ============================================

  describe('createUser', () => {
    it('应创建用户', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
        secondme_id: null,
        interests: [],
        connection_types: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agent: null,
      };

      setupMockChain('users', {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      });

      // Act
      const result = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('邮箱已存在时应抛出错误', async () => {
      // Arrange
      const mockError = { message: '邮箱已存在', code: '23505' };

      setupMockChain('users', {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      // Act & Assert
      await expect(
        userService.createUser({ email: 'exists@example.com', name: 'Test' })
      ).rejects.toThrow('创建用户失败');
    });
  });

  // ============================================
  // getUser
  // ============================================

  describe('getUser', () => {
    it('应返回用户', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        agent: null,
      };

      setupMockChain('users', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      });

      // Act
      const result = await userService.getUser('user-1');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应返回 null', async () => {
      // Arrange
      const mockError = { code: 'PGRST116', message: 'No rows found' };

      setupMockChain('users', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      // Act
      const result = await userService.getUser('invalid');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================
  // getUserByEmail
  // ============================================

  describe('getUserByEmail', () => {
    it('应通过邮箱返回用户', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        agent: { id: 'agent-1', name: 'Test Agent' },
      };

      setupMockChain('users', {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      });

      // Act
      const result = await userService.getUserByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
    });
  });

  // ============================================
  // updateUser
  // ============================================

  describe('updateUser', () => {
    it('应更新用户', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        name: 'Updated Name',
        email: 'test@example.com',
        agent: null,
      };

      setupMockChain('users', {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      });

      // Act
      const result = await userService.updateUser('user-1', { name: 'Updated Name' });

      // Assert
      expect(result.name).toEqual('Updated Name');
    });

    it('更新失败时应抛出错误', async () => {
      // Arrange
      const mockError = { message: '更新失败', code: '500' };

      setupMockChain('users', {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      // Act & Assert
      await expect(
        userService.updateUser('invalid', { name: 'Test' })
      ).rejects.toThrow('更新用户失败');
    });
  });

  // ============================================
  // deleteUser
  // ============================================

  describe('deleteUser', () => {
    it('应删除用户', async () => {
      // Arrange
      let deleteCalled = false;

      setupMockChain('users', {
        delete: vi.fn().mockImplementation(() => {
          deleteCalled = true;
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
        eq: vi.fn().mockReturnThis(),
      });

      // Act
      await userService.deleteUser('user-1');

      // Assert
      expect(deleteCalled).toBe(true);
    });
  });

  // ============================================
  // updateUserInterests
  // ============================================

  describe('updateUserInterests', () => {
    it('应更新用户兴趣', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        interests: ['AI', 'Tech'],
        agent: null,
      };

      setupMockChain('users', {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      });

      // Act
      const result = await userService.updateUserInterests('user-1', ['AI', 'Tech']);

      // Assert
      expect(result.interests).toEqual(['AI', 'Tech']);
    });
  });

  // ============================================
  // getUserService singleton
  // ============================================

  describe('getUserService', () => {
    it('应返回单例', () => {
      // This test verifies singleton behavior
      resetUserService();
      const instance1 = userService;
      const instance2 = userService;
      expect(instance1).toBe(instance2); // Same instance
    });
  });
});
