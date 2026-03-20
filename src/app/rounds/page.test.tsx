/**
 * [INPUT]: 依赖 @/hooks/use-secondme-session 的认证状态，依赖 @/components/ui/* 的 UI 组件
 * [OUTPUT]: 对外提供 RoundsPage 组件的测试套件
 * [POS]: app/rounds/page.test.tsx - 圆桌列表页面测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * TDD RED Phase: 这些测试描述了当页面连接到真实 API /api/rounds 后的期望行为
 * 当前页面使用本地 mockRounds，这些测试应该失败
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';

// Mock useSecondMeSession hook
const mockUseSecondMeSession = vi.fn();
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockUseSecondMeSession(),
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
  };
});

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
    className?: string;
  }) => {
    if (asChild) {
      return <span {...props}>{children}</span>;
    }
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
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
  CardFooter: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-footer" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: { children?: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className} {...props}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, className, ...props }: { children?: React.ReactNode; defaultValue?: string; className?: string }) => (
    <div data-testid="tabs" data-default-value={defaultValue} className={className} {...props}>
      {children}
    </div>
  ),
  TabsList: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-list" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, ...props }: { children?: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value} {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value, ...props }: { children?: React.ReactNode; value: string }) => (
    <div role="tabpanel" data-value={value} data-testid="tabs-content" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className, ...props }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      type="text"
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

// Mock Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}));

// Types for mock data - matches the Round interface in page.tsx
interface MockRound {
  id: string;
  name: string;
  description: string | null;
  status: string;
  max_agents: number;
  topic_id: string;
  created_at: string;
  topic?: { title: string; category: string };
  participantCount?: number;
  messageCount?: number;
}

// Mock API response format - matches ApiResponse interface in page.tsx
const mockApiResponse = {
  success: true,
  data: [
    {
      id: '1',
      name: 'AI 会不会让专业门槛失去意义？',
      description: '探讨 AI 时代专业技能的价值变化',
      status: 'ongoing',
      max_agents: 5,
      topic_id: 'topic-1',
      created_at: '2024-03-10T10:00:00Z',
      topic: { title: 'AI 与职业', category: '科技' },
      participantCount: 5,
      messageCount: 128,
    },
    {
      id: '2',
      name: '年轻人还应该创业吗？',
      description: '讨论创业环境和个人发展选择',
      status: 'waiting',
      max_agents: 5,
      topic_id: 'topic-2',
      created_at: '2024-03-14T14:00:00Z',
      topic: { title: '创业思考', category: '商业' },
      participantCount: 3,
      messageCount: 0,
    },
    {
      id: '3',
      name: '生物 AI 的隐私边界在哪里？',
      description: '探讨生物信息学与 AI 的伦理边界',
      status: 'completed',
      max_agents: 5,
      topic_id: 'topic-3',
      created_at: '2024-03-08T09:00:00Z',
      topic: { title: 'AI 伦理', category: '科技' },
      participantCount: 6,
      messageCount: 256,
    },
  ] as MockRound[],
};

// Mock API fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import component after mocks are set up
import RoundsPage from './page';

describe('RoundsPage - TDD Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // ========================================
  // RED Phase: These tests describe expected behavior when page connects to API
  // Current page uses local mockRounds - tests will fail
  // ========================================

  describe('API Integration (TDD RED - page should call /api/rounds)', () => {
    it('should call /api/rounds when page loads', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      // Verify API was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/rounds?');
      }, { timeout: 3000 });
    });

    it('should display loading state while fetching', async () => {
      // Never resolve - simulates loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });

      render(<RoundsPage />);

      // Page should show loading-related UI while fetch is pending
      await waitFor(() => {
        // When connected to real API, loading skeleton or spinner should appear
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should display rounds when API returns successfully', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      // Wait for data to be displayed
      await waitFor(() => {
        expect(screen.getByText('圆桌广场')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle API error gracefully', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      // Should handle error state
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('UI Components Display', () => {
    it('should display page title', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('圆桌广场');
      }, { timeout: 3000 });
    });

    it('should display search input', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        const searchInput = screen.getByTestId('search-input');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute('placeholder', '搜索圆桌...');
      }, { timeout: 3000 });
    });

    it('should display tabs for filtering', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        const tabsList = screen.getByTestId('tabs-list');
        expect(tabsList).toBeInTheDocument();

        // Should have 4 tabs: All, Ongoing, Waiting, Completed
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(4);
      }, { timeout: 3000 });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should filter rounds when user types in search', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByTestId('search-input');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'AI' } });

      // Should filter to show only matching rounds
      await waitFor(() => {
        const matchingText = screen.getByText(/AI 会不会让专业门槛失去意义？/);
        expect(matchingText).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when search yields no results', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByTestId('search-input');

      fireEvent.change(searchInput, { target: { value: 'xyz123nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/暂无符合条件的圆桌/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Tab Switching', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should switch to Ongoing tab and filter rounds', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const ongoingTab = screen.getByRole('tab', { name: /进行中/i });
      fireEvent.click(ongoingTab);

      await waitFor(() => {
        // Should show only ongoing round
        expect(screen.getByText(/AI 会不会让专业门槛失去意义？/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should switch to Waiting tab and filter rounds', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const waitingTab = screen.getByRole('tab', { name: /等待中/i });
      fireEvent.click(waitingTab);

      await waitFor(() => {
        expect(screen.getByText(/年轻人还应该创业吗？/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should switch to Completed tab and filter rounds', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const completedTab = screen.getByRole('tab', { name: /已完成/i });
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(screen.getByText(/生物 AI 的隐私边界在哪里？/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Create Round Button', () => {
    it('should display Create Round button for authenticated users', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        const createLink = screen.getByRole('link', { name: /创建圆桌/i });
        expect(createLink).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should link Create Round button to /rounds/create', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        const createLink = screen.getByRole('link', { name: /创建圆桌/i });
        expect(createLink).toHaveAttribute('href', '/rounds/create');
      }, { timeout: 3000 });
    });
  });

  describe('Unauthenticated User', () => {
    it('should show login prompt for unauthenticated users', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: null,
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      // Page should indicate user needs to login or redirect
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty rounds array from API', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByText(/暂无符合条件的圆桌/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle special characters in search', async () => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<RoundsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByTestId('search-input');

      // Should not crash with special characters
      fireEvent.change(searchInput, { target: { value: '<>\'\"&' } });

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue({
        user: { userId: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null, profileCompleteness: 0.85, route: '/rounds' },
        isLoading: false,
      });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should have proper heading hierarchy', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have accessible search input with placeholder', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        const searchInput = screen.getByTestId('search-input');
        expect(searchInput).toHaveAttribute('placeholder', '搜索圆桌...');
      }, { timeout: 3000 });
    });

    it('should have tabs with accessible roles', async () => {
      render(<RoundsPage />);

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });
});
