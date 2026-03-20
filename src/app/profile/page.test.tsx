/**
 * 用户资料页测试
 * [INPUT]: 依赖 vitest, @testing-library/react, next-auth
 * [OUTPUT]: 验证用户资料页 API 集成功能
 * [PROTOCOL]: 变更时更新此头部
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import ProfilePage from './page';

// Mock useSecondMeSession hook
vi.mock('@/hooks/use-secondme-session', () => ({
  useSecondMeSession: () => ({
    user: {
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      profileCompleteness: 0.85,
      route: '/profile',
    },
    isLoading: false,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
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
  User: () => <span data-testid="user-icon">User</span>,
  Settings: () => <span data-testid="settings">Settings</span>,
  MessageSquare: () => <span data-testid="message-square">MessageSquare</span>,
  FileText: () => <span data-testid="file-text">FileText</span>,
  Users: () => <span data-testid="users">Users</span>,
  Sparkles: () => <span data-testid="sparkles">Sparkles</span>,
  TrendingUp: () => <span data-testid="trending-up">TrendingUp</span>,
  Calendar: () => <span data-testid="calendar">Calendar</span>,
  Edit: () => <span data-testid="edit">Edit</span>,
  Plus: () => <span data-testid="plus">Plus</span>,
  ArrowRight: () => <span data-testid="arrow-right">ArrowRight</span>,
  Shield: () => <span data-testid="shield">Shield</span>,
  Bot: () => <span data-testid="bot">Bot</span>,
  Clock: () => <span data-testid="clock">Clock</span>,
  Zap: () => <span data-testid="zap">Zap</span>,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, asChild }: { children: React.ReactNode; onClick?: () => void; asChild?: boolean }) => {
    if (asChild) {
      return <a href="/api/auth/secondme/redirect">{children}</a>;
    }
    return <button onClick={onClick}>{children}</button>;
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUserData = {
  id: 'user-1',
  name: '张三',
  email: 'zhangsan@example.com',
  avatar: null,
  bio: '专注于 AI 产品设计和团队协作',
  expertise: ['AI产品', '产品设计', '用户增长'],
  interests: ['技术创业', '产品思维', '团队管理'],
  connection_types: ['cofounder', 'peer'],
  stats: {
    total_rounds: 12,
    total_matches: 8,
    successful_cotrials: 5,
    days_active: 45,
  },
  created_at: '2024-02-15T00:00:00.000Z',
};

const mockAgentsData = [
  {
    id: 'agent-1',
    name: 'AI 产品助手',
    personality: '理性分析，擅长产品逻辑',
    is_active: true,
    rounds_joined: 8,
  },
  {
    id: 'agent-2',
    name: '协作观察员',
    personality: '温和友善，善于发现他人优点',
    is_active: true,
    rounds_joined: 4,
  },
];

const mockTimelineData = [
  {
    id: 'event-1',
    event_type: 'round.joined',
    aggregate_type: 'round',
    aggregate_id: 'round-1',
    created_at: '2024-03-15T10:00:00Z',
    metadata: { round_name: 'AI 与职业发展' },
  },
  {
    id: 'event-2',
    event_type: 'match.generated',
    aggregate_type: 'match',
    aggregate_id: 'match-1',
    created_at: '2024-03-14T15:30:00Z',
    metadata: { match_reason: '互补性强' },
  },
];

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('用户资料页 - API 集成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/[id] - 获取用户信息', () => {
    it('成功获取用户信息并渲染', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        });

      render(<ProfilePage />);

      // 验证用户 API 被调用
      await waitFor(() => {
        const userCalls = mockFetch.mock.calls.filter(
          (call) => call[0] === '/api/users/user-1'
        );
        expect(userCalls.length).toBeGreaterThanOrEqual(1);
      });

      // 验证用户名渲染
      await waitFor(() => {
        expect(screen.getByText(/张三/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('用户不存在时显示错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: { code: 'NOT_FOUND', message: '用户不存在' },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        const userCalls = mockFetch.mock.calls.filter(
          (call) => call[0] === '/api/users/user-1'
        );
        expect(userCalls.length).toBeGreaterThanOrEqual(1);
      });

      await waitFor(() => {
        expect(screen.getByText(/出错了/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('网络错误时显示错误状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('网络错误'));

      render(<ProfilePage />);

      await waitFor(() => {
        const userCalls = mockFetch.mock.calls.filter(
          (call) => call[0] === '/api/users/user-1'
        );
        expect(userCalls.length).toBeGreaterThanOrEqual(1);
      });

      await waitFor(() => {
        expect(screen.getByText(/网络错误/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('GET /api/agents - 获取用户 Agents', () => {
    it('成功获取 Agents 列表并渲染', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        });

      render(<ProfilePage />);

      // 验证 agents API 被调用
      await waitFor(() => {
        const agentCalls = mockFetch.mock.calls.filter(
          (call) => call[0].includes('/api/agents')
        );
        expect(agentCalls.length).toBeGreaterThanOrEqual(1);
      });

      // 先切换到 agents 标签页
      const agentTab = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('我的 Agent'));
      }, { timeout: 3000 });

      if (agentTab) {
        await act(async () => {
          fireEvent.click(agentTab);
        });

        // 验证 agent 名称渲染
        await waitFor(() => {
          expect(screen.getByText(/AI 产品助手/)).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });

    it('Agents 为空时显示创建提示', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
          }),
        });

      render(<ProfilePage />);

      // 验证 agents API 被调用
      await waitFor(() => {
        const agentCalls = mockFetch.mock.calls.filter(
          (call) => call[0].includes('/api/agents')
        );
        expect(agentCalls.length).toBeGreaterThanOrEqual(1);
      });

      // 切换到 agents 标签页
      const agentTab = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('我的 Agent'));
      }, { timeout: 3000 });

      if (agentTab) {
        await act(async () => {
          fireEvent.click(agentTab);
        });

        // 验证创建新 Agent 按钮存在（使用 getAllByText 因为可能有多个）
        await waitFor(() => {
          const buttons = screen.getAllByText(/创建新 Agent/);
          expect(buttons.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
      }
    });
  });

  describe('数据展示验证', () => {
    it('渲染用户统计数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        });

      render(<ProfilePage />);

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText(/参与圆桌/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // 验证统计数据值
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('渲染专业领域标签', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        });

      render(<ProfilePage />);

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText(/AI产品/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // 使用 getAllByText 因为产品设计可能出现在多个地方
      const productDesignElements = screen.getAllByText(/产品设计/);
      expect(productDesignElements.length).toBeGreaterThan(0);
    });

    it('标签页切换功能正常', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        });

      render(<ProfilePage />);

      // 等待初始加载
      await waitFor(() => {
        expect(screen.getByText(/概览/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // 点击 Agent 标签
      const agentTab = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('我的 Agent'));
      }, { timeout: 3000 });

      if (agentTab) {
        await act(async () => {
          fireEvent.click(agentTab);
        });

        await waitFor(() => {
          expect(screen.getByText(/AI 产品助手/)).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });
  });

  describe('GET /api/timeline - 获取最近活动', () => {
    it('成功获取最近活动并渲染', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTimelineData,
          }),
        });

      render(<ProfilePage />);

      // 验证 timeline API 被调用
      await waitFor(() => {
        const timelineCalls = mockFetch.mock.calls.filter(
          (call) => call[0]?.includes('/api/timeline')
        );
        expect(timelineCalls.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 3000 });

      // 等待活动数据加载 - 检查是否显示活动标题
      await waitFor(() => {
        expect(screen.getByText(/AI 与职业发展/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('timeline API 返回空数据时显示暂无活动记录', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUserData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockAgentsData,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
          }),
        });

      render(<ProfilePage />);

      // 验证 timeline API 被调用
      await waitFor(() => {
        const timelineCalls = mockFetch.mock.calls.filter(
          (call) => call[0]?.includes('/api/timeline')
        );
        expect(timelineCalls.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 3000 });

      // 切换到活动标签页
      const activityTab = await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.textContent?.includes('参与记录'));
      }, { timeout: 3000 });

      if (activityTab) {
        await act(async () => {
          fireEvent.click(activityTab);
        });

        // 验证显示暂无活动记录
        await waitFor(() => {
          expect(screen.getByText(/暂无活动记录/)).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });
  });
});
