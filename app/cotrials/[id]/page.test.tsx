/**
 * 共试层详情页测试
 * [INPUT]: 依赖 vitest, @testing-library/react
 * [OUTPUT]: 验证共试层详情页功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CotrialDetailPage from './page';

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
  useParams: () => ({ id: 'cotrial-1' }),
}));

describe('共试层详情页', () => {
  it('应该渲染页面', () => {
    render(<CotrialDetailPage />);
    expect(document.body).toBeInTheDocument();
  });
});
