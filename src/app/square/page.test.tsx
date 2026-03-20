/**
 * [INPUT]: 依赖 @/hooks/use-secondme-session 的认证状态，依赖 @/components/ui/* 的 UI 组件
 * [OUTPUT]: 对外提供 SquarePage 组件的测试套件
 * [POS]: app/square/page.test.tsx - 社区广场页面测试
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
    Award: MockIcon,
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, ...props }: { children?: React.ReactNode }) => (
    <h3 data-testid="card-title" {...props}>
      {children}
    </h3>
  ),
  CardDescription: ({ children, ...props }: { children?: React.ReactNode }) => (
    <p data-testid="card-description" {...props}>
      {children}
    </p>
  ),
  CardContent: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
    <span {...props}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs" {...props}>
      {children}
    </div>
  ),
  TabsList: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-list" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, ...props }: { children?: React.ReactNode }) => (
    <button data-testid="tabs-trigger" {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-content" {...props}>
      {children}
    </div>
  ),
}));

// Mock API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// 测试数据
// ============================================

const mockActiveRounds = [
  {
    id: 'round-1',
    name: 'AI与职业发展',
    description: '探讨AI如何改变职业赛道',
    topic: { title: '职业发展' },
    participant_count: 5,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
  },
];

const mockFeaturedMatches = [
  {
    id: 'match-1',
    user_a: { name: '张三', avatar: null },
    user_b: { name: '李四', avatar: null },
    overall_score: 92,
    relationship_type: 'cofounder',
    match_reason: '技术和商业的完美互补',
  },
];

const mockSuccessCases = [
  {
    id: 'case-1',
    title: '从圆桌到共创',
    description: '两位陌生人在圆桌相遇，最终一起创业',
    participants: [
      { name: '王五', avatar: null },
      { name: '赵六', avatar: null },
    ],
    outcome: '已成立公司',
  },
];

// ============================================
// 测试设置
// ============================================

function setupSession(isAuthenticated: boolean) {
  mockUseSecondMeSession.mockReturnValue({
    user: isAuthenticated ? { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/square' } : null,
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

describe('SquarePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('未登录状态', () => {
    it('应显示社区广场介绍', async () => {
      setupSession(false);
      setupFetchResponse({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });

      const { default: SquarePage } = await import('./page');

      render(<SquarePage />);

      await waitFor(() => {
        expect(screen.getByText('社区广场')).toBeTruthy();
      });
    });
  });

  describe('加载状态', () => {
    it('应显示加载动画', async () => {
      setupSession(true);
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { default: SquarePage } = await import('./page');

      render(<SquarePage />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-loader2')).toBeTruthy();
      });
    });
  });

  describe('成功加载数据', () => {
    it('应显示活跃圆桌列表', async () => {
      setupSession(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockActiveRounds }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockFeaturedMatches }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSuccessCases }),
        });

      const { default: SquarePage } = await import('./page');

      render(<SquarePage />);

      await waitFor(() => {
        expect(screen.getByText('社区广场')).toBeTruthy();
        expect(screen.getByText('活跃圆桌')).toBeTruthy();
      });
    });

    it('应显示推荐知遇卡', async () => {
      setupSession(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockActiveRounds }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockFeaturedMatches }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSuccessCases }),
        });

      const { default: SquarePage } = await import('./page');

      render(<SquarePage />);

      await waitFor(() => {
        expect(screen.getByText('推荐知遇卡')).toBeTruthy();
      });
    });

    it('应显示成功案例', async () => {
      setupSession(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockActiveRounds }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockFeaturedMatches }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSuccessCases }),
        });

      const { default: SquarePage } = await import('./page');

      render(<SquarePage />);

      await waitFor(() => {
        expect(screen.getByText('成功案例')).toBeTruthy();
      });
    });
  });
});
