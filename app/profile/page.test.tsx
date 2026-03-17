/**
 * 用户资料页测试
 * [INPUT]: 依赖 vitest, @testing-library/react
 * [OUTPUT]: 验证用户资料页功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePage from './page';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('用户资料页', () => {
  it('应该渲染页面', () => {
    render(<ProfilePage />);
    expect(document.body).toBeInTheDocument();
  });
});
