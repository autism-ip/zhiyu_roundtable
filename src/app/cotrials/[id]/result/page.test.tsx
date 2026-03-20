/**
 * 共试结果页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, @/hooks/use-secondme-session
 * [OUTPUT]: 验证共试结果页功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CotrialResultPage from './page';

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
  useParams: () => ({ id: 'cotrial-1' }),
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
  ArrowLeft: () => <span data-testid="arrow-left">ArrowLeft</span>,
  CheckCircle: () => <span data-testid="check-circle">CheckCircle</span>,
  XCircle: () => <span data-testid="x-circle">XCircle</span>,
  ArrowRight: () => <span data-testid="arrow-right">ArrowRight</span>,
  Loader2: () => <span data-testid="loader">Loader2</span>,
  MessageSquare: () => <span data-testid="message-square">MessageSquare</span>,
  ThumbsUp: () => <span data-testid="thumbs-up">ThumbsUp</span>,
  ThumbsDown: () => <span data-testid="thumbs-down">ThumbsDown</span>,
  Clock: () => <span data-testid="clock">Clock</span>,
}));

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

const mockCotrialData = {
  id: 'cotrial-1',
  debate_id: 'debate-1',
  task_type: 'collaborative Writing',
  task_description: '共同撰写一篇关于 AI 时代的职业发展的文章',
  task_goal: '输出一篇有深度的行业分析文章',
  result: '双方成功完成了文章撰写，内容涵盖了 AI 对职业发展的影响及应对策略',
  completed: true,
  completed_at: '2024-03-15T18:00:00Z',
  feedback_a: {
    rating: 5,
    comment: '非常好的合作体验，对方提供了很多有价值的观点',
  },
  feedback_b: {
    rating: 4,
    comment: '沟通顺畅，期待下次合作',
  },
  continued: true,
};

describe('共试结果页 - 功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('页面渲染', () => {
    it('渲染共试结果标题', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/共试结果/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染任务描述', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/共同撰写一篇关于 AI 时代的职业发展的文章/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染任务结果', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/双方成功完成了文章撰写/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('渲染反馈评价', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/非常好的合作体验/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('API 集成', () => {
    it('调用 cotrial API 获取数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cotrials/cotrial-1');
      }, { timeout: 5000 });
    });
  });

  describe('完成状态', () => {
    it('显示已完成标签', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/已完成/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('显示继续合作选项', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCotrialData,
        }),
      });

      render(<CotrialResultPage />);

      await waitFor(() => {
        expect(screen.getByText(/继续合作/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
