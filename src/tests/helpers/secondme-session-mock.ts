/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 导出 SecondMeUser、SecondMeSession 类型别名、createMockUser、createMockSession 工厂函数
 * [POS]: tests/helpers 的 SecondMe Session mock 工厂，支持 authenticated/unauthenticated/loading 三种状态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// Type Definitions
// ============================================================

interface SecondMeUser {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  profileCompleteness: number;
  route: string;
}

interface SecondMeSession {
  user: SecondMeUser | null;
  isLoading: boolean;
}

// ============================================================
// Default Mock Data
// ============================================================

const DEFAULT_MOCK_USER: SecondMeUser = {
  userId: 'user_test_123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
  profileCompleteness: 0.85,
  route: '/rounds',
};

const DEFAULT_LOADING_SESSION: SecondMeSession = {
  user: null,
  isLoading: true,
};

const DEFAULT_AUTHENTICATED_SESSION: SecondMeSession = {
  user: DEFAULT_MOCK_USER,
  isLoading: false,
};

const DEFAULT_UNAUTHENTICATED_SESSION: SecondMeSession = {
  user: null,
  isLoading: false,
};

// ============================================================
// Factory Functions
// ============================================================

/**
 * 创建 Mock SecondMeUser
 * @param overrides - 部分覆盖默认值的字段
 */
function createMockUser(overrides: Partial<SecondMeUser> = {}): SecondMeUser {
  return {
    ...DEFAULT_MOCK_USER,
    ...overrides,
  };
}

/**
 * 创建 Mock SecondMeSession
 * @param options - 会话配置
 * @param options.state - 'authenticated' | 'unauthenticated' | 'loading'
 * @param options.userOverrides - 当 state 为 authenticated 时，可覆盖用户字段
 */
function createMockSession(options: {
  state?: 'authenticated' | 'unauthenticated' | 'loading';
  userOverrides?: Partial<SecondMeUser>;
} = {}): SecondMeSession {
  const { state = 'authenticated', userOverrides = {} } = options;

  switch (state) {
    case 'loading':
      return { ...DEFAULT_LOADING_SESSION };

    case 'unauthenticated':
      return { ...DEFAULT_UNAUTHENTICATED_SESSION };

    case 'authenticated':
    default:
      return {
        user: createMockUser(userOverrides),
        isLoading: false,
      };
  }
}

// ============================================================
// Exports
// ============================================================

export type { SecondMeUser, SecondMeSession };

export {
  createMockUser,
  createMockSession,
  DEFAULT_MOCK_USER,
  DEFAULT_LOADING_SESSION,
  DEFAULT_AUTHENTICATED_SESSION,
  DEFAULT_UNAUTHENTICATED_SESSION,
};
