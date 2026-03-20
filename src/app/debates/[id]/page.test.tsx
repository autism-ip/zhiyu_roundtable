/**
 * 争鸣层详情页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, @testing-library/user-event
 * [OUTPUT]: 验证争鸣层详情页功能
 * [PROTOCOL]: 变更时更新此头部
 *
 * TDD 覆盖场景:
 * - 加载状态显示
 * - 未登录状态重定向
 * - 辩论内容展示
 * - 进度显示
 * - 操作按钮
 * - 隐私提示
 * - API 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================
// Mock 数据 - 使用 API 格式 (snake_case)
// ============================================

const mockDebateData = {
  id: 'debate-1',
  match_id: 'match-1',
  scenario: 'cofounder',
  questions: [
    {
      id: 'q1',
      type: 'conflict',
      content: '如果你们要一起做一个项目，遇到意见分歧时，你会怎么处理？',
      purpose: '测试冲突处理能力',
      expectedDimensions: ['沟通能力', '解决问题的能力'],
      userResponse: '',
      partnerResponse: '我会先倾听对方的观点，理解背后的原因，然后寻找共同点。',
    },
    {
      id: 'q2',
      type: 'scenario',
      content: '描述一个你过去做过的最冒险的决定，结果如何？',
      purpose: '了解风险偏好',
      expectedDimensions: ['决策能力', '冒险精神'],
      userResponse: '',
      partnerResponse: '',
    },
    {
      id: 'q3',
      type: 'decision',
      content: '在资源有限的情况下，你会优先考虑产品质量还是上线速度？',
      purpose: '测试决策风格',
      expectedDimensions: ['价值观', '优先级排序'],
      userResponse: '',
      partnerResponse: '',
    },
  ],
  responses: [],
  analysis: null,
  relationship_suggestion: 'cofounder',
  should_connect: true,
  risk_areas: ['沟通风格差异', '决策时机'],
  next_steps: ['建立定期沟通机制', '明确角色分工'],
  status: 'ongoing' as const,
  created_at: '2024-03-10T00:00:00.000Z',
  updated_at: '2024-03-10T00:00:00.000Z',
};

const mockApiResponse = {
  success: true,
  data: mockDebateData,
};

const mockErrorResponse = {
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: '辩论不存在',
  },
};

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
    route: '/debates',
  },
  isLoading: false,
};

// Mock use-secondme-session
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => mockSessionState,
}));

// ============================================
// Mock framer-motion
// ============================================
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => {
        const { initial, animate, exit, variants, className, key, ...rest } = props;
        return <div data-testid="motion-div" {...rest}>{children}</div>;
      },
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

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
    Brain: MockIcon,
    XCircle: MockIcon,
    Scale: MockIcon,
  };
});

// ============================================
// Mock next/navigation
// ============================================
const mockUseRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

const mockUseParams = vi.fn(() => ({ id: 'debate-1' }));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useParams: () => mockUseParams(),
}));

// ============================================
// Mock UI components
// ============================================
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div data-testid="progress" data-value={value} {...props}>
      <div style={{ width: `${value}%` }} data-testid="progress-bar" />
    </div>
  ),
}));

// ============================================
// Mock fetch API
// ============================================
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// Import component AFTER mocks are set up
// ============================================
import DebateDetailPage from './page';

// ============================================
// Helper to set authenticated/unauthenticated state
// ============================================
const setAuthenticatedState = () => {
  mockSessionState.user = {
    userId: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    profileCompleteness: 0.85,
    route: '/debates',
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

// ============================================
// 辅助函数
// ============================================
function setupFetchMock(data: any, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

describe('争鸣层详情页 - TDD 测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    setAuthenticatedState(); // Default to authenticated
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('加载状态', () => {
    it('当 session 状态为 loading 时应显示加载状态', async () => {
      setLoadingState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('未登录状态', () => {
    it('当用户未登录时应显示登录提示', async () => {
      setUnauthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/登录后进入争鸣层/)).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: /立即登录/ })).toBeInTheDocument();
    });
  });

  describe('已登录状态 - 辩论内容', () => {
    it('应显示辩论标题和描述', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('争鸣层')).toBeInTheDocument();
      });
      expect(screen.getByText('结构化对练，验证合作可行性')).toBeInTheDocument();
    });
  });

  describe('进度显示', () => {
    it('应显示当前问题编号和总题数', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('问题 1 / 3')).toBeInTheDocument();
      });
    });

    it('应显示进度百分比', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('33%')).toBeInTheDocument();
      });
    });
  });

  describe('操作按钮', () => {
    it('应显示上一题按钮（第一题时禁用）', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      const prevButton = await waitFor(() => screen.getByRole('button', { name: /上一题/ }));
      expect(prevButton).toBeDisabled();
    });

    it('应显示下一题按钮', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /下一题/ })).toBeInTheDocument();
      });
    });

    it('应显示暂不回答按钮', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂不回答/ })).toBeInTheDocument();
      });
    });

    it('提交按钮在输入为空时应禁用', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      const submitButton = await waitFor(() => screen.getByRole('button', { name: /下一题/ }));
      expect(submitButton).toBeDisabled();
    });
  });

  describe('返回链接', () => {
    it('应显示返回知遇卡链接', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /返回知遇卡/ })).toBeInTheDocument();
      });
    });
  });

  describe('隐私提示', () => {
    it('应显示隐私保护提示', async () => {
      setAuthenticatedState();
      setupFetchMock(mockApiResponse);

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('隐私保护')).toBeInTheDocument();
      });
      expect(screen.getByText(/你的回答仅用于AI分析/)).toBeInTheDocument();
    });
  });

  describe('API 错误处理', () => {
    it('当 API 请求失败时应显示错误状态', async () => {
      setAuthenticatedState();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse,
      });

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('辩论不存在')).toBeInTheDocument();
      });
    });

    it('当网络错误时应显示网络错误提示', async () => {
      setAuthenticatedState();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('网络错误，请稍后重试')).toBeInTheDocument();
      });
    });
  });

  describe('数据不存在', () => {
    it('当 API 返回 success=false 时应显示错误', async () => {
      setAuthenticatedState();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: { code: 'ERROR', message: '获取辩论失败' } }),
      });

      render(<DebateDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('获取辩论失败')).toBeInTheDocument();
      });
    });
  });
});
