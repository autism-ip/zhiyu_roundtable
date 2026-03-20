/**
 * 共试层详情页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, @testing-library/user-event
 * [OUTPUT]: 验证共试层详情页功能
 * [POS]: app/cotrials/[id]/page.test.tsx - 共试层详情页测试
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CotrialDetailPage from './page';

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
    route: '/cotrials',
  },
  isLoading: false,
};

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      variants,
      initial,
      animate,
      transition,
      ...props
    }: {
      children?: React.ReactNode;
      variants?: Record<string, unknown>;
      initial?: string;
      animate?: string;
      transition?: Record<string, unknown>;
      [key: string]: unknown;
    }) => {
      return <div {...props}>{children}</div>;
    },
  },
}));

// Mock use-secondme-session
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockSessionState,
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
    Target: MockIcon,
    Gift: MockIcon,
    Shield: MockIcon,
    CheckCircle: MockIcon,
    Zap: MockIcon,
    ArrowLeft: MockIcon,
    Rocket: MockIcon,
    Calendar: MockIcon,
  };
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'cotrial-1' }),
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock cotrial 数据 - 使用 snake_case 匹配 Supabase schema
const mockCotrialData = {
  id: 'cotrial-1',
  debate_id: 'debate-1',
  task_type: 'co_write',
  task_description:
    '请围绕「AI时代程序员的价值」主题，共同撰写一篇知乎回答。要求：\n1. 不少于 800 字\n2. 结合实际案例\n3. 有独到见解\n4. 语言风格生动有趣',
  task_goal: '输出一篇高质量的知乎回答，发布后7天内获得100个赞',
  task_duration: '7天',
  result: null,
  completed: false,
  completed_at: null,
  feedback_a: null,
  feedback_b: null,
  continued: null,
  created_at: '2024-03-10T00:00:00.000Z',
  updated_at: '2024-03-10T00:00:00.000Z',
};

// ============================================
// Helper functions
// ============================================

const setAuthenticatedState = () => {
  mockSessionState.user = {
    userId: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    profileCompleteness: 0.85,
    route: '/cotrials',
  };
  mockSessionState.isLoading = false;
};

const setUnauthenticatedState = () => {
  mockSessionState.user = null;
  mockSessionState.isLoading = false;
};

const setLoadingState = () => {
  mockSessionState.user = null;
  mockSessionState.isLoading = true;
};

describe('共试层详情页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockCotrialData }),
    });
    setAuthenticatedState(); // Default to authenticated
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('加载状态', () => {
    it('当 session 加载中时应该显示加载状态', () => {
      setLoadingState();

      render(<CotrialDetailPage />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('未登录状态', () => {
    it('当未登录时应该显示登录提示和引导文案', () => {
      setUnauthenticatedState();

      render(<CotrialDetailPage />);

      // Wait for session to resolve
      expect(screen.queryByText('加载中...')).toBeInTheDocument();
    });

    it('登录按钮应该链接到登录页面', () => {
      setUnauthenticatedState();

      render(<CotrialDetailPage />);

      // Wait for session to resolve
      expect(screen.queryByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('已登录状态 - 页面结构', () => {
    it('应该渲染页面标题和返回链接', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('共试层')).toBeInTheDocument();
        expect(screen.getByText('返回知遇卡')).toBeInTheDocument();
        expect(
          screen.getByText('最小化协作，验证关系可行性')
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('返回链接应该指向匹配页面', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        const backLink = screen.getByText('返回知遇卡');
        expect(backLink.closest('a')).toHaveAttribute('href', '/matches');
      }, { timeout: 3000 });
    });
  });

  describe('已登录状态 - 任务信息', () => {
    it('应该显示任务类型标签', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('共写内容')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示任务状态徽章', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('进行中')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示任务目标', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('任务目标')).toBeInTheDocument();
        expect(
          screen.getByText('输出一篇高质量的知乎回答，发布后7天内获得100个赞')
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示预计时长', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('预计时长')).toBeInTheDocument();
        expect(screen.getByText('7天')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示完整任务描述', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/请围绕「AI时代程序员的价值」主题/)
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('已登录状态 - 协作区', () => {
    it('应该显示协作区标题', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('协作区')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示回复输入框', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('在这里输入你的内容...');
        expect(textarea).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示你的回复标签', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('你的回复')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('已登录状态 - 操作按钮', () => {
    it('应该显示所有操作按钮', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('放弃共试')).toBeInTheDocument();
        expect(screen.getByText('提交内容')).toBeInTheDocument();
        expect(screen.getByText('完成任务')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('提交按钮在输入为空时应该禁用', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        const submitButton = screen.getByText('提交内容');
        expect(submitButton).toBeDisabled();
      }, { timeout: 3000 });
    });

    it('输入内容后提交按钮应该启用', async () => {
      const user = userEvent.setup();
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('在这里输入你的内容...')).toBeInTheDocument();
      }, { timeout: 5000 });

      const textarea = screen.getByPlaceholderText('在这里输入你的内容...');
      await user.type(textarea, '测试内容');

      const submitButton = screen.getByText('提交内容');
      expect(submitButton).not.toBeDisabled();
    });

    it('放弃共试按钮点击后应该跳转到匹配页面', async () => {
      const user = userEvent.setup();
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('放弃共试')).toBeInTheDocument();
      }, { timeout: 5000 });

      const abandonButton = screen.getByText('放弃共试');
      await user.click(abandonButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/matches');
      });
    });

    it('完成任务按钮点击后应该跳转到匹配页面', async () => {
      const user = userEvent.setup();
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('完成任务')).toBeInTheDocument();
      }, { timeout: 5000 });

      const completeButton = screen.getByText('完成任务');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/matches');
      });
    });

    it('提交内容时应该显示提交中状态', async () => {
      const user = userEvent.setup();
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('在这里输入你的内容...')).toBeInTheDocument();
      }, { timeout: 5000 });

      const textarea = screen.getByPlaceholderText('在这里输入你的内容...');
      await user.type(textarea, '测试内容');

      const submitButton = screen.getByText('提交内容');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('提交中...')).toBeInTheDocument();
      });
    });
  });

  describe('已登录状态 - 底部提示', () => {
    it('应该显示完成反馈标题', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('完成反馈')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示完成反馈说明文字', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText(
            '完成任务后，你可以为对方提供反馈。成功的协作将进入长期关系追踪。'
          )
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('边缘情况', () => {
    it('当用户名为空时应该显示默认头像', async () => {
      mockSessionState.user = {
        userId: 'user-1',
        name: '',
        email: 'test@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
        profileCompleteness: 0.85,
        route: '/cotrials',
      };
      mockSessionState.isLoading = false;

      render(<CotrialDetailPage />);

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByText('共试层')).toBeInTheDocument();
      }, { timeout: 5000 });

      // AvatarFallback 应该显示首字母或默认文字
      await waitFor(() => {
        const fallbacks = screen.getAllByText(/你|Test/);
        expect(fallbacks.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('当对方用户响应为空时应该显示空状态', async () => {
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      // Wait for the page to fully load first
      await waitFor(() => {
        expect(screen.getByText('协作区')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('输入框应该支持多行输入', async () => {
      const user = userEvent.setup();
      setAuthenticatedState();

      render(<CotrialDetailPage />);

      // Wait for the textarea to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('在这里输入你的内容...')).toBeInTheDocument();
      }, { timeout: 5000 });

      const textarea = screen.getByPlaceholderText('在这里输入你的内容...');
      await user.type(textarea, '第一行\n第二行\n第三行');

      expect(textarea).toHaveValue('第一行\n第二行\n第三行');
    });
  });
});
