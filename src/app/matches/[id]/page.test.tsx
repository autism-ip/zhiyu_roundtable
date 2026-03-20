/**
 * 知遇卡详情页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, @/hooks/use-secondme-session
 * [OUTPUT]: 验证知遇卡详情页 API 集成功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MatchDetailPage from './page';

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
    route: '/matches',
  },
  isLoading: false,
};

// Mock use-secondme-session
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockSessionState,
}));

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'match-1' }),
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
    ArrowLeft: MockIcon,
    Flame: MockIcon,
    Target: MockIcon,
    Zap: MockIcon,
    Gift: MockIcon,
    Shield: MockIcon,
    CheckCircle: MockIcon,
  };
});

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: () => <span data-testid="progress">Progress</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockMatchData = {
  id: 'match-1',
  user_a_id: 'user-1',
  user_b_id: 'user-2',
  user_a: {
    id: 'user-1',
    name: '张三',
    avatar: null,
    expertise: ['AI', '产品'],
    interests: ['技术创业', '产品设计'],
  },
  user_b: {
    id: 'user-2',
    name: '李四',
    avatar: null,
    expertise: ['后端', '架构'],
    interests: ['分布式系统', '性能优化'],
  },
  complementarity_score: 85,
  future_generativity_score: 78,
  overall_score: 82,
  relationship_type: 'cofounder',
  match_reason: '在AI产品设计方面有很强的互补性',
  complementarity_areas: ['AI产品思维', '系统架构', '从0到1'],
  insights: [
    '你们在AI应用层有很强的协同效应',
    '一个偏商业化思维，一个偏技术实现',
  ],
  status: 'pending',
  created_at: '2024-03-10T00:00:00.000Z',
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('知遇卡详情页 - API 集成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
    mockFetch.mockReset();
    // Reset to authenticated state
    mockSessionState.user = {
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
      profileCompleteness: 0.85,
      route: '/matches',
    };
    mockSessionState.isLoading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/matches/[id] - 获取知遇卡详情', () => {
    it('成功获取知遇卡详情并渲染', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMatchData,
        }),
      });

      render(<MatchDetailPage />);

      // 验证 API 被调用
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches/match-1');
      }, { timeout: 3000 });

      // 验证页面加载成功 - 检查关键元素存在
      await waitFor(() => {
        expect(screen.getByText(/知遇卡详情/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('知遇卡不存在时显示错误状态', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: { code: 'NOT_FOUND', message: '知遇卡不存在' },
        }),
      });

      render(<MatchDetailPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches/match-1');
      });

      await waitFor(() => {
        expect(screen.getByText(/出错了/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('API 错误时显示错误状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('网络错误'));

      render(<MatchDetailPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches/match-1');
      });

      await waitFor(() => {
        expect(screen.getByText(/网络错误/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('POST /api/matches/[id]/decline - 拒绝匹配', () => {
    it('点击婉拒按钮调用 API 并跳转', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockMatchData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { ...mockMatchData, status: 'declined' },
          }),
        });

      render(<MatchDetailPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches/match-1');
      });

      // 等待数据加载后找到婉拒按钮
      const declineButton = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('婉拒'));
      }, { timeout: 3000 });

      expect(declineButton).toBeTruthy();

      if (declineButton) {
        fireEvent.click(declineButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/matches/match-1/decline',
            expect.objectContaining({
              method: 'POST',
              headers: expect.any(Object),
              body: JSON.stringify({ userId: 'user-1' }),
            })
          );
        });

        await waitFor(() => {
          expect(pushMock).toHaveBeenCalledWith('/matches');
        }, { timeout: 2000 });
      }
    });
  });

  describe('POST /api/matches/[id]/initiate - 发起争鸣', () => {
    it('点击接受按钮调用 initiate API 并跳转', async () => {
      const debateId = 'debate-new-1';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockMatchData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: debateId },
          }),
        });

      render(<MatchDetailPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/matches/match-1');
      });

      // 等待数据加载后找到接受按钮
      const acceptButton = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('接受'));
      }, { timeout: 3000 });

      expect(acceptButton).toBeTruthy();

      if (acceptButton) {
        fireEvent.click(acceptButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/matches/match-1/initiate',
            expect.objectContaining({
              method: 'POST',
              headers: expect.any(Object),
            })
          );
        });

        await waitFor(() => {
          expect(pushMock).toHaveBeenCalledWith(`/debates/${debateId}`);
        }, { timeout: 2000 });
      }
    });
  });
});
