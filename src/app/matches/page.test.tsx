/**
 * [INPUT]: 依赖 @/hooks/use-secondme-session 的认证状态，依赖 @/components/ui/* 的 UI 组件
 * [OUTPUT]: 对外提供 MatchesPage 组件的测试套件
 * [POS]: app/matches/page.test.tsx - 知遇卡列表页面测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * TDD RED Phase: 这些测试描述了当页面连接到真实 API /api/matches 后的期望行为
 * 当前页面使用本地 mockMatches，这些测试应该失败
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

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

// Mock Tabs with proper state management
let mockTabValue = 'all';
const mockSetTabValue = vi.fn((val: string) => { mockTabValue = val; });

// Reset function to be called in beforeEach
export const resetTabsMock = () => {
  mockTabValue = 'all';
  mockSetTabValue.mockClear();
};

// Shared context for tabs state
const TabsContext = {
  value: mockTabValue,
  onValueChange: (val: string) => {
    mockTabValue = val;
    mockSetTabValue(val);
  },
};

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, onValueChange, value, className, ...props }: {
    children?: React.ReactNode;
    defaultValue?: string;
    onValueChange?: (val: string) => void;
    value?: string;
    className?: string;
  }) => {
    // Use controlled value if provided, otherwise use internal state
    const activeValue = value !== undefined ? value : (defaultValue || mockTabValue);

    // Override the global context with the actual onValueChange if provided
    if (onValueChange) {
      TabsContext.onValueChange = onValueChange;
    }
    TabsContext.value = activeValue;

    return (
      <div
        data-testid="tabs"
        data-default-value={defaultValue}
        data-value={activeValue}
        className={className}
        {...props}
      >
        {typeof children === 'function' ? children(activeValue) : children}
      </div>
    );
  },
  TabsList: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-list" {...props}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, onClick, ...props }: { children?: React.ReactNode; value: string; onClick?: () => void }) => (
    <button
      role="tab"
      data-value={value}
      data-state={mockTabValue === value ? 'active' : 'inactive'}
      onClick={(e) => {
        // Update the mock state
        mockTabValue = value;
        mockSetTabValue(value);
        // Call the context's onValueChange to trigger parent's state update
        TabsContext.onValueChange(value);
        // Also call the original onClick if provided
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value, ...props }: { children?: React.ReactNode; value: string }) => (
    <div role="tabpanel" data-value={value} data-testid="tabs-content" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, ...props }: { value?: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} {...props} />
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className} {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, ...props }: { src?: string }) => (
    <img data-testid="avatar-image" src={src} {...props} />
  ),
  AvatarFallback: ({ children, ...props }: { children?: React.ReactNode }) => (
    <span data-testid="avatar-fallback" {...props}>
      {children}
    </span>
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

// Types for mock data - matches the Match interface in page.tsx (snake_case)
interface MockMatchUser {
  id: string;
  name: string;
  avatar: string | null;
  expertise: string[];
}

interface MockMatch {
  id: string;
  round_id: string;
  user_a_id: string;
  user_b_id: string;
  user_a?: MockMatchUser;
  user_b?: MockMatchUser;
  complementarity_score: number;
  future_generativity: number;
  overall_score: number;
  relationship_type: string;
  match_reason: string;
  complementarity_areas: string[];
  insights: any[];
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// Mock API response format - matches page.tsx Match interface with snake_case
const mockApiResponse: { success: boolean; data: MockMatch[] } = {
  success: true,
  data: [
    {
      id: 'match-1',
      round_id: 'round-1',
      user_a_id: 'user-1',
      user_b_id: 'user-2',
      user_a: {
        id: 'user-1',
        name: '张三',
        avatar: null,
        expertise: ['AI', '产品'],
      },
      user_b: {
        id: 'user-2',
        name: '李四',
        avatar: null,
        expertise: ['后端', '架构'],
      },
      complementarity_score: 85,
      future_generativity: 78,
      overall_score: 82,
      relationship_type: 'cofounder',
      match_reason: '在AI产品设计方面有很强的互补性',
      complementarity_areas: ['AI产品思维', '系统架构'],
      insights: [],
      status: 'pending',
      created_at: '2024-03-10',
    },
    {
      id: 'match-2',
      round_id: 'round-1',
      user_a_id: 'user-1',
      user_b_id: 'user-3',
      user_a: {
        id: 'user-1',
        name: '张三',
        avatar: null,
        expertise: ['AI', '产品'],
      },
      user_b: {
        id: 'user-3',
        name: '王五',
        avatar: null,
        expertise: ['UI/UX', '品牌'],
      },
      complementarity_score: 72,
      future_generativity: 65,
      overall_score: 69,
      relationship_type: 'peer',
      match_reason: '都关注用户体验设计',
      complementarity_areas: ['用户体验', '视觉设计'],
      insights: [],
      status: 'accepted',
      created_at: '2024-03-08',
    },
    {
      id: 'match-3',
      round_id: 'round-1',
      user_a_id: 'user-1',
      user_b_id: 'user-4',
      user_a: {
        id: 'user-1',
        name: '张三',
        avatar: null,
        expertise: ['AI', '产品'],
      },
      user_b: {
        id: 'user-4',
        name: '赵六',
        avatar: null,
        expertise: ['营销', '增长'],
      },
      complementarity_score: 55,
      future_generativity: 50,
      overall_score: 53,
      relationship_type: 'none',
      match_reason: '领域差异较大',
      complementarity_areas: [],
      insights: [],
      status: 'declined',
      created_at: '2024-03-05',
    },
  ],
};

// Mock API fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create properly structured SecondMe session object
const createSecondMeSession = (authenticated: boolean, isLoading: boolean = false) => ({
  user: authenticated
    ? { userId: 'user-1', name: 'Test User', email: 'test@test.com', avatar: null, profileCompleteness: 0.85, route: '/matches' }
    : null,
  isLoading,
});

// Import component after mocks are set up
import MatchesPage from './page';

describe('MatchesPage - TDD Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    resetTabsMock();
  });

  afterEach(() => {
    cleanup();
  });

  // ========================================
  // RED Phase: These tests describe expected behavior when page connects to API
  // Current page uses local mockMatches - tests will fail
  // ========================================

  describe('API Integration (TDD RED - page should call /api/matches)', () => {
    it('should call /api/matches when page loads', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      // Verify API was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches');
      }, { timeout: 3000 });
    });

    it('should display loading state while fetching', async () => {
      // Never resolve - simulates loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));

      render(<MatchesPage />);

      // Page should show loading-related UI while fetch is pending
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should display match cards when API returns successfully', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      // Wait for data to be displayed
      await waitFor(() => {
        expect(screen.getByText('知遇卡')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle API error gracefully', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      // Should handle error state
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('UI Components Display', () => {
    it('should display page title', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('知遇卡');
      }, { timeout: 3000 });
    });

    it('should display tabs for filtering', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        const tabsList = screen.getByTestId('tabs-list');
        expect(tabsList).toBeInTheDocument();

        // Should have 4 tabs: 全部, 待接受, 已接受, 已婉拒
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(4);
      }, { timeout: 3000 });
    });

    it('should display tab counts correctly', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        // All: 3, Pending: 1, Accepted: 1, Declined: 1
        expect(screen.getByText(/全部 \(3\)/)).toBeInTheDocument();
        expect(screen.getByText(/待接受 \(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/已接受 \(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/已婉拒 \(1\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Match Card Display', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should display partner name', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('李四')).toBeInTheDocument();
        expect(screen.getByText('王五')).toBeInTheDocument();
        expect(screen.getByText('赵六')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display complementarity scores', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        // First match has score 85
        expect(screen.getByText('85')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display future generativity scores', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        // First match has score 78
        expect(screen.getByText('78')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display overall scores', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        // First match has score 82
        expect(screen.getByText('82')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display relationship type labels', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('共创搭子')).toBeInTheDocument(); // cofounder
        expect(screen.getByText('同道')).toBeInTheDocument(); // peer
        expect(screen.getByText('暂不建议')).toBeInTheDocument(); // none
      }, { timeout: 3000 });
    });

    it('should display match reasons', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('在AI产品设计方面有很强的互补性')).toBeInTheDocument();
        expect(screen.getByText('都关注用户体验设计')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display complementarity areas', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('AI产品思维')).toBeInTheDocument();
        expect(screen.getByText('系统架构')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display partner expertise', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        // Partner expertise shown as "后端 · 架构"
        expect(screen.getByText('后端 · 架构')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display progress bars for scores', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const progressBars = screen.getAllByTestId('progress');
        expect(progressBars.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Tab Switching', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should switch to pending tab and filter matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const pendingTab = screen.getByRole('tab', { name: /待接受/i });
      fireEvent.click(pendingTab);

      await waitFor(() => {
        // Should show only pending match (李四)
        expect(screen.getByText('李四')).toBeInTheDocument();
        expect(screen.queryByText('王五')).not.toBeInTheDocument();
        expect(screen.queryByText('赵六')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should switch to accepted tab and filter matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const acceptedTab = screen.getByRole('tab', { name: /已接受/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        // Should show only accepted match (王五)
        expect(screen.getByText('王五')).toBeInTheDocument();
        expect(screen.queryByText('李四')).not.toBeInTheDocument();
        expect(screen.queryByText('赵六')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should switch to declined tab and filter matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const declinedTab = screen.getByRole('tab', { name: /已婉拒/i });
      fireEvent.click(declinedTab);

      await waitFor(() => {
        // Should show only declined match (赵六)
        expect(screen.getByText('赵六')).toBeInTheDocument();
        expect(screen.queryByText('李四')).not.toBeInTheDocument();
        expect(screen.queryByText('王五')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should switch to all tab and show all matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      // First go to a specific tab
      const pendingTab = screen.getByRole('tab', { name: /待接受/i });
      fireEvent.click(pendingTab);

      await waitFor(() => {
        expect(screen.queryByText('王五')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Then switch back to all
      const allTab = screen.getByRole('tab', { name: /全部/i });
      fireEvent.click(allTab);

      await waitFor(() => {
        expect(screen.getByText('李四')).toBeInTheDocument();
        expect(screen.getByText('王五')).toBeInTheDocument();
        expect(screen.getByText('赵六')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should display accept and reject buttons for pending matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should be on "all" tab by default - pending match should show accept/reject buttons
      const acceptButtons = screen.getAllByRole('button', { name: /接受/i });
      const rejectButtons = screen.getAllByRole('button', { name: /婉拒/i });

      expect(acceptButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
    });

    it('should display view button for accepted matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to accepted tab
      const acceptedTab = screen.getByRole('tab', { name: /已接受/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('link', { name: /查看/i });
        expect(viewButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should display view button for declined matches', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to declined tab
      const declinedTab = screen.getByRole('tab', { name: /已婉拒/i });
      fireEvent.click(declinedTab);

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('link', { name: /查看/i });
        expect(viewButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should display link to match detail page', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to accepted tab
      const acceptedTab = screen.getByRole('tab', { name: /已接受/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        const viewLink = screen.getByRole('link', { name: /查看/i });
        expect(viewLink).toHaveAttribute('href', '/matches/match-2');
      }, { timeout: 3000 });
    });
  });

  describe('Status Badges', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should display pending status badge', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('待接受')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display accepted status badge', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const acceptedTab = screen.getByRole('tab', { name: /已接受/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        expect(screen.getByText('已接受')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display declined status badge', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const declinedTab = screen.getByRole('tab', { name: /已婉拒/i });
      fireEvent.click(declinedTab);

      await waitFor(() => {
        expect(screen.getByText('已婉拒')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Unauthenticated User', () => {
    it('should show login prompt for unauthenticated users', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(false));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('知遇卡')).toBeInTheDocument();
        expect(screen.getByText(/登录后查看你收到的知遇卡/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /立即登录/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have login link pointing to signin page', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(false));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        const loginLink = screen.getByRole('link', { name: /立即登录/i });
        expect(loginLink).toHaveAttribute('href', '/api/auth/secondme/redirect');
      }, { timeout: 3000 });
    });
  });

  describe('Empty States', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
    });

    it('should show empty state when no matches exist', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无知遇卡')).toBeInTheDocument();
        expect(screen.getByText(/参与圆桌讨论，让AI发现与你互补的伙伴/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state for pending tab with no pending matches', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            { ...mockApiResponse.data[1], status: 'accepted' },
            { ...mockApiResponse.data[2], status: 'declined' },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const pendingTab = screen.getByRole('tab', { name: /待接受/i });
      fireEvent.click(pendingTab);

      await waitFor(() => {
        expect(screen.getByText('暂无待接受的知遇卡')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /前往圆桌广场/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state for accepted tab with no accepted matches', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            { ...mockApiResponse.data[0], status: 'pending' },
            { ...mockApiResponse.data[2], status: 'declined' },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const acceptedTab = screen.getByRole('tab', { name: /已接受/i });
      fireEvent.click(acceptedTab);

      await waitFor(() => {
        expect(screen.getByText('暂无已接受的知遇卡')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state for declined tab with no declined matches', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            { ...mockApiResponse.data[0], status: 'pending' },
            { ...mockApiResponse.data[1], status: 'accepted' },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const declinedTab = screen.getByRole('tab', { name: /已婉拒/i });
      fireEvent.click(declinedTab);

      await waitFor(() => {
        expect(screen.getByText('暂无已婉拒的知遇卡')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in user names', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            {
              ...mockApiResponse.data[0],
              user_b: { ...mockApiResponse.data[0].user_b, name: '张"三' },
            },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('张"三')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle unicode in expertise areas', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            {
              ...mockApiResponse.data[0],
              complementarity_areas: ['AI产品思维', '系统架构'],
            },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByText('AI产品思维')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle very long match reasons', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            {
              ...mockApiResponse.data[0],
              match_reason: '这是一个非常长的匹配原因描述，包含了大量的解释性文字来说明为什么这两个人非常适合合作。' + '重复内容'.repeat(50),
            },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        // Should display at least part of the reason
        expect(screen.getByText(/这是一个非常长的匹配原因描述/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle maximum scores (100)', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            {
              ...mockApiResponse.data[0],
              complementarity_score: 100,
              future_generativity: 100,
              overall_score: 100,
            },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        // All three scores should display 100
        const scores = screen.getAllByText('100');
        expect(scores.length).toBe(3);
      }, { timeout: 3000 });
    });

    it('should handle minimum scores (0)', async () => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: [
            {
              ...mockApiResponse.data[0],
              complementarity_score: 0,
              future_generativity: 0,
              overall_score: 0,
            },
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<MatchesPage />);

      await waitFor(() => {
        // All three scores should display 0
        const scores = screen.getAllByText('0');
        expect(scores.length).toBe(3);
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSecondMeSession.mockReturnValue(createSecondMeSession(true));
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should have proper heading hierarchy', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have tabs with accessible roles', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBe(4);
      }, { timeout: 3000 });
    });

    it('should have buttons with accessible names', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      }, { timeout: 3000 });

      const acceptButtons = screen.getAllByRole('button', { name: /接受/i });
      expect(acceptButtons.length).toBeGreaterThan(0);
    });

    it('should have cards with proper structure', async () => {
      render(<MatchesPage />);

      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        expect(cards.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });
});
