/**
 * 知遇卡列表页 - 婉拒确认 + Toast 测试
 * [INPUT]: 依赖 react-testing-library, vitest
 * [OUTPUT]: 测试 MatchesPage 婉拒流程
 * [POS]: app/matches/__tests__/ - 婉拒确认 Dialog + Toast 行为测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

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
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => {
    if (asChild) {
      return <span {...props}>{children}</span>;
    }
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children?: React.ReactNode }) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: (props: any) => <div data-testid="avatar" {...props} />,
  AvatarImage: (props: any) => <img {...props} />,
  AvatarFallback: ({ children, ...props }: { children?: React.ReactNode }) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange?.('all')} {...props}>
      {children}
    </div>
  ),
  TabsList: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-list" {...props}>{children}</div>
  ),
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button data-testid="tabs-trigger" data-value={value} {...props}>{children}</button>
  ),
  TabsContent: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="tabs-content" {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: (props: any) => <div data-testid="progress" {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-header" {...props}>{children}</div>
  ),
  CardTitle: ({ children, ...props }: { children?: React.ReactNode }) => (
    <h3 data-testid="card-title" {...props}>{children}</h3>
  ),
  CardDescription: ({ children, ...props }: { children?: React.ReactNode }) => (
    <p data-testid="card-description" {...props}>{children}</p>
  ),
  CardContent: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  CardFooter: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="card-footer" {...props}>{children}</div>
  ),
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// Mock ConfirmDialog
vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    title,
    description,
    confirmText,
    onConfirm,
    isLoading,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    isLoading: boolean;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="confirm-dialog">
        <span data-testid="dialog-title">{title}</span>
        <span data-testid="dialog-description">{description}</span>
        <button data-testid="dialog-confirm" onClick={onConfirm} disabled={isLoading}>
          {confirmText}
        </button>
        <button data-testid="dialog-cancel" onClick={() => onOpenChange(false)}>
          取消
        </button>
      </div>
    );
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 模拟数据
const mockMatches = [
  {
    id: 'match-1',
    round_id: 'round-1',
    user_a_id: 'user-a',
    user_b_id: 'user-b',
    user_b: {
      id: 'user-b',
      name: '张三',
      avatar: null,
      expertise: ['前端开发', 'React'],
    },
    complementarity_score: 85,
    future_generativity: 78,
    overall_score: 82,
    relationship_type: 'cofounder',
    match_reason: '你们在技术互补性上非常匹配',
    complementarity_areas: ['前端开发', '架构设计'],
    insights: [],
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  },
];

describe('MatchesPage - 婉拒确认 + Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockUseSecondMeSession.mockReturnValue({
      user: { userId: 'user-123', name: 'Test User' },
    });
  });

  it('点击婉拒按钮后应显示确认 Dialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockMatches }),
    });

    const { default: MatchesPage } = await import('../page');
    render(<MatchesPage />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // 找到婉拒按钮并点击 (排除 tabs trigger)
    const buttons = screen.getAllByRole('button');
    const declineButton = buttons.find(btn =>
      btn.textContent?.includes('婉拒') &&
      !btn.textContent?.includes('已婉拒') &&
      !btn.getAttribute('data-value')
    );
    expect(declineButton).toBeDefined();
    fireEvent.click(declineButton!);

    // 验证确认 Dialog 出现
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('婉拒此匹配');
    });
  });

  it('确认婉拒后应调用 API 并显示 Toast', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMatches }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { default: MatchesPage } = await import('../page');
    render(<MatchesPage />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // 点击婉拒按钮
    // 找到婉拒按钮 (排除 tabs trigger)
    const buttons = screen.getAllByRole('button');
    const declineButton = buttons.find(btn =>
      btn.textContent?.includes('婉拒') &&
      !btn.textContent?.includes('已婉拒') &&
      !btn.getAttribute('data-value')
    );
    expect(declineButton).toBeDefined();
    fireEvent.click(declineButton!);
    fireEvent.click(declineButton);

    // 等待确认 Dialog
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });

    // 点击确认按钮
    const confirmButton = screen.getByTestId('dialog-confirm');
    fireEvent.click(confirmButton);

    // 验证 API 调用
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/matches/match-1/decline',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-123' }),
        })
      );
    });

    // 验证 Toast
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        '已婉拒此匹配',
        expect.objectContaining({
          description: '对方不会收到通知',
        })
      );
    });
  });

  it('取消婉拒后 Dialog 关闭，不调用 API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockMatches }),
    });

    const { default: MatchesPage } = await import('../page');
    render(<MatchesPage />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // 点击婉拒按钮
    // 找到婉拒按钮 (排除 tabs trigger)
    const buttons = screen.getAllByRole('button');
    const declineButton = buttons.find(btn =>
      btn.textContent?.includes('婉拒') &&
      !btn.textContent?.includes('已婉拒') &&
      !btn.getAttribute('data-value')
    );
    expect(declineButton).toBeDefined();
    fireEvent.click(declineButton!);
    fireEvent.click(declineButton);

    // 等待 Dialog 出现
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });

    // 点击取消按钮
    const cancelButton = screen.getByTestId('dialog-cancel');
    fireEvent.click(cancelButton);

    // 验证 Dialog 关闭
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    // 验证只有初始加载调用了 API（没有调用 decline API）
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('API 失败时应显示错误 Toast', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMatches }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { code: 'DECLINE_FAILED', message: '婉拒失败' },
        }),
      });

    const { default: MatchesPage } = await import('../page');
    render(<MatchesPage />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // 点击婉拒按钮
    // 找到婉拒按钮 (排除 tabs trigger)
    const buttons = screen.getAllByRole('button');
    const declineButton = buttons.find(btn =>
      btn.textContent?.includes('婉拒') &&
      !btn.textContent?.includes('已婉拒') &&
      !btn.getAttribute('data-value')
    );
    expect(declineButton).toBeDefined();
    fireEvent.click(declineButton!);
    fireEvent.click(declineButton);

    // 点击确认按钮
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
    const confirmButton = screen.getByTestId('dialog-confirm');
    fireEvent.click(confirmButton);

    // 验证错误 Toast
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        '操作失败',
        expect.objectContaining({
          description: '婉拒失败',
        })
      );
    });
  });

  it('网络错误时应显示网络错误 Toast', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMatches }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { default: MatchesPage } = await import('../page');
    render(<MatchesPage />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // 点击婉拒按钮
    // 找到婉拒按钮 (排除 tabs trigger)
    const buttons = screen.getAllByRole('button');
    const declineButton = buttons.find(btn =>
      btn.textContent?.includes('婉拒') &&
      !btn.textContent?.includes('已婉拒') &&
      !btn.getAttribute('data-value')
    );
    expect(declineButton).toBeDefined();
    fireEvent.click(declineButton!);
    fireEvent.click(declineButton);

    // 点击确认按钮
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
    const confirmButton = screen.getByTestId('dialog-confirm');
    fireEvent.click(confirmButton);

    // 验证网络错误 Toast
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        '网络错误',
        expect.objectContaining({
          description: '请检查网络连接后重试',
        })
      );
    });
  });
});
