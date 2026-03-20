/**
 * 争鸣结果页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, @/hooks/use-secondme-session
 * [OUTPUT]: 验证争鸣结果页功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DebateResultPage from './page';

// Mock SecondMe session hook
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => ({
    user: {
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
      profileCompleteness: 0.85,
      route: '/rounds',
    },
    isLoading: false,
  }),
}));

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'debate-1' }),
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
    CheckCircle: MockIcon,
    Zap: MockIcon,
    Target: MockIcon,
    Shield: MockIcon,
    Gift: MockIcon,
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockDebateData = {
  id: 'debate-1',
  match_id: 'match-1',
  status: 'completed',
  relationship_suggestion: 'cofounder',
  should_connect: true,
  risk_areas: ['沟通方式差异', '决策风格不同'],
  next_steps: ['建立定期沟通机制', '明确分工与职责'],
  analysis: {
    alignment: 75,
    conflict_potential: 30,
    collaboration_score: 80,
  },
  match: {
    user_a: { id: 'user-1', name: '张三', avatar: null },
    user_b: { id: 'user-2', name: '李四', avatar: null },
  },
};

describe('争鸣结果页 - 功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('页面渲染', () => {
    it('渲染争鸣结果标题', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/争鸣结果/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染关系建议', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/共创搭子/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染风险领域', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/沟通方式差异/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染下一步行动', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/建立定期沟通机制/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('API 集成', () => {
    it('调用 debate API 获取数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/debates/debate-1');
      }, { timeout: 5000 });
    });
  });

  describe('操作按钮', () => {
    it('渲染返回按钮', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDebateData,
        }),
      });

      render(<DebateResultPage />);

      await waitFor(() => {
        const backButton = document.querySelector('a[href*="/debates"]');
        expect(backButton).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
