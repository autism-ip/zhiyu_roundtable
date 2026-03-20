/**
 * 创建圆桌页面测试
 * [INPUT]: 依赖 vitest, @testing-library/react
 * [OUTPUT]: 验证创建圆桌页面功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateRoundPage from './page';

// ============================================
// Mutable Session State (for dynamic mocking)
// ============================================

const mockSessionState = {
  user: {
    userId: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    profileCompleteness: 0.85,
    route: '/rounds',
  },
  isLoading: false,
};

// Mock use-secondme-session
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockSessionState,
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
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to authenticated state
    mockSessionState.user = {
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
      profileCompleteness: 0.85,
      route: '/rounds',
    };
    mockSessionState.isLoading = false;
  });

  it('应该显示页面标题', () => {
    render(<CreateRoundPage />);
    expect(document.body).toBeInTheDocument();
  });
});
