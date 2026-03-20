/**
 * Agent 模式页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, next-auth
 * [OUTPUT]: 验证 Agent 模式页功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import AgentModePage from './page';

// Mock useSecondMeSession hook
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => ({
    user: {
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      profileCompleteness: 0.85,
      route: '/agent-mode',
    },
    isLoading: false,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => children,
    button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Bot: () => <span data-testid="bot">Bot</span>,
  User: () => <span data-testid="user">User</span>,
  Zap: () => <span data-testid="zap">Zap</span>,
  Settings: () => <span data-testid="settings">Settings</span>,
  ArrowLeft: () => <span data-testid="arrow-left">ArrowLeft</span>,
  Check: () => <span data-testid="check">Check</span>,
  Loader2: () => <span data-testid="loader">Loader2</span>,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, asChild }: { children: React.ReactNode; onClick?: () => void; asChild?: boolean }) => {
    if (asChild) {
      return <a href="/api/auth/secondme/redirect">{children}</a>;
    }
    return <button onClick={onClick}>{children}</button>;
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUserAgents = [
  {
    id: 'agent-1',
    name: 'AI 产品助手',
    personality: '理性分析，擅长产品逻辑',
    is_active: true,
  },
];

describe('Agent 模式页 - 功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('页面渲染', () => {
    it('渲染返回链接', async () => {
      render(<AgentModePage />);

      await waitFor(() => {
        const backLink = document.querySelector('a[href="/profile"]');
        expect(backLink).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
