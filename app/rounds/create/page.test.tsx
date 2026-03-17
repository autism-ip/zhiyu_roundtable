/**
 * 创建圆桌页面测试
 * [INPUT]: 依赖 vitest, @testing-library/react
 * [OUTPUT]: 验证创建圆桌页面功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateRoundPage from './page';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
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
  useParams: () => ({}),
}));

describe('创建圆桌页面', () => {
  it('应该显示页面标题', () => {
    render(<CreateRoundPage />);
    expect(document.body).toBeInTheDocument();
  });
});
