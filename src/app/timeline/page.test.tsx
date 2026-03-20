/**
 * [INPUT]: 依赖 @/hooks/use-secondme-session 的认证状态，依赖 @/components/ui/* 的 UI 组件
 * [OUTPUT]: 对外提供 TimelinePage 组件的测试套件
 * [POS]: app/timeline/page.test.tsx - 时间线页面测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// Mock useSecondMeSession hook
const mockUseSecondMeSession = vi.fn();
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockUseSecondMeSession(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => {
    const React = require('react');
    return React.createElement('svg', { 'data-testid': 'lucide-icon', ...props });
  };
  return {
    Telescope: MockIcon,
    MessageSquare: MockIcon,
    Handshake: MockIcon,
    Sparkles: MockIcon,
    ArrowRight: MockIcon,
    Heart: MockIcon,
    Quote: MockIcon,
    Clock: MockIcon,
    Users: MockIcon,
    User: MockIcon,
    Bot: MockIcon,
    AlertTriangle: MockIcon,
    ChevronRight: MockIcon,
    Check: MockIcon,
    Circle: MockIcon,
    X: MockIcon,
    Send: MockIcon,
    MoreVertical: MockIcon,
    Trash2: MockIcon,
    Edit: MockIcon,
    Copy: MockIcon,
    ExternalLink: MockIcon,
    Menu: MockIcon,
    Search: MockIcon,
    Plus: MockIcon,
    Minus: MockIcon,
    Settings: MockIcon,
    LogOut: MockIcon,
    Loader2: MockIcon,
    Image: MockIcon,
    Play: MockIcon,
    Pause: MockIcon,
    SkipBack: MockIcon,
    SkipForward: MockIcon,
    Volume2: MockIcon,
    VolumeX: MockIcon,
    Maximize: MockIcon,
    Minimize: MockIcon,
    RefreshCw: MockIcon,
    Star: MockIcon,
    Flag: MockIcon,
    ThumbsUp: MockIcon,
    ThumbsDown: MockIcon,
    TrendingUp: MockIcon,
    MessageCircle: MockIcon,
    Lightbulb: MockIcon,
    Activity: MockIcon,
    Calendar: MockIcon,
  };
});

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// 测试数据
// ============================================

const mockTimelineEvents = [
  {
    id: 'event-1',
    timestamp: '2024-01-15T10:00:00Z',
    action: 'round.created',
    actor: { type: 'user', id: 'user-1' },
    resource: { type: 'round', id: 'round-1', name: 'AI与职业发展' },
    summary: '创建了圆桌',
  },
  {
    id: 'event-2',
    timestamp: '2024-01-15T11:00:00Z',
    action: 'match.generated',
    actor: { type: 'user', id: 'user-1' },
    resource: { type: 'match', id: 'match-1' },
    summary: '获得了新的知遇卡',
  },
];

// ============================================
// 测试设置
// ============================================

function setupSession(isAuthenticated: boolean) {
  mockUseSecondMeSession.mockReturnValue({
    user: isAuthenticated ? { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/timeline' } : null,
    isLoading: false,
  });
}

function setupFetchResponse(data: any, ok: boolean = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(data),
  });
}

// ============================================
// 测试
// ============================================

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('未登录状态', () => {
    it('应显示登录提示', async () => {
      setupSession(false);
      setupFetchResponse({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });

      // Dynamic import to avoid hoisting issues
      const { default: TimelinePage } = await import('./page');

      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('时间线')).toBeTruthy();
      });
    });
  });

  describe('加载状态', () => {
    it('应显示加载动画', async () => {
      setupSession(true);
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { default: TimelinePage } = await import('./page');

      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-loader2')).toBeTruthy();
      });
    });
  });

  describe('成功加载数据', () => {
    it('应显示时间线事件列表', async () => {
      setupSession(true);
      setupFetchResponse({ success: true, data: mockTimelineEvents });

      const { default: TimelinePage } = await import('./page');

      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('时间线')).toBeTruthy();
        expect(screen.getByText('创建了圆桌')).toBeTruthy();
        expect(screen.getByText('获得了新的知遇卡')).toBeTruthy();
      });
    });

    it('应显示空状态当没有事件时', async () => {
      setupSession(true);
      setupFetchResponse({ success: true, data: [] });

      const { default: TimelinePage } = await import('./page');

      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText(/暂无历史记录/)).toBeTruthy();
      });
    });
  });

  describe('错误处理', () => {
    it('应显示错误消息', async () => {
      setupSession(true);
      setupFetchResponse({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取时间线失败' } });

      const { default: TimelinePage } = await import('./page');

      render(<TimelinePage />);

      await waitFor(() => {
        expect(screen.getByText('获取时间线失败')).toBeTruthy();
      });
    });
  });
});
