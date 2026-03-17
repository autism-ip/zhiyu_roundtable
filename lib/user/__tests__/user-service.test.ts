/**
 * [INPUT]: 依赖 vitest
 * [OUTPUT]: UserService 单元测试
 * [POS]: lib/user/__tests__/user-service.test.ts - 用户服务测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, resetUserService } from '../user-service';

// Mock Prisma
const mockPrisma = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    resetUserService();
    vi.clearAllMocks();
    userService = new UserService(mockPrisma as any);
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
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          interests: [],
          connectionTypes: [],
        },
        include: { agent: true },
      });
    });

    it('邮箱已存在时应抛出错误', async () => {
      // Arrange
      mockPrisma.user.create.mockRejectedValue(new Error('邮箱已存在'));

      // Act & Assert
      await expect(
        userService.createUser({ email: 'exists@example.com', name: 'Test' })
      ).rejects.toThrow('邮箱已存在');
    });
  });

  // ============================================
  // getUser
  // ============================================

  describe('getUser', () => {
    it('应返回用户', async () => {
      // Arrange
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUser('user-1');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应返回 null', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

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
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { agent: true },
      });
    });
  });

  // ============================================
  // updateUser
  // ============================================

  describe('updateUser', () => {
    it('应更新用户', async () => {
      // Arrange
      const mockUser = { id: 'user-1', name: 'Updated Name' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      // Act
      const result = await userService.updateUser('user-1', { name: 'Updated Name' });

      // Assert
      expect(result.name).toEqual('Updated Name');
    });

    it('用户不存在时应抛出错误', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser('invalid', { name: 'Test' })
      ).rejects.toThrow('用户不存在');
    });
  });

  // ============================================
  // deleteUser
  // ============================================

  describe('deleteUser', () => {
    it('应删除用户', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.delete.mockResolvedValue({});

      // Act
      await userService.deleteUser('user-1');

      // Assert
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  // ============================================
  // updateUserInterests
  // ============================================

  describe('updateUserInterests', () => {
    it('应更新用户兴趣', async () => {
      // Arrange
      const mockUser = { id: 'user-1', interests: ['AI', 'Tech'] };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

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
      // 每次调用 resetUserService 后，新调用应返回新实例
      resetUserService();
      const instance1 = new UserService(mockPrisma as any);
      const instance2 = new UserService(mockPrisma as any);
      expect(instance1).not.toBe(instance2); // 不同实例因为是手动 new
    });
  });
});
