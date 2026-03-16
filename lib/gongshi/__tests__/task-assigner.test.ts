/**
 * [INPUT]: 依赖 vitest 和 TaskAssigner，依赖 MinimaxClient
 * [OUTPUT]: 对外提供共试层任务分配器的 TDD 测试
 * [POS]: lib/gongshi/__tests__/task-assigner.test.ts - 共试层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskAssigner, TaskAssignerConfig } from '../task-assigner';
import { getMinimaxClient, resetMinimaxClient } from '@/lib/ai/minimax-client';
import type { Debate, User } from '@/types';

// Mock Minimax 客户端
vi.mock('@/lib/ai/minimax-client', () => ({
  getMinimaxClient: vi.fn(),
  resetMinimaxClient: vi.fn(),
}));

describe('TaskAssigner', () => {
  let assigner: TaskAssigner;

  beforeEach(() => {
    assigner = new TaskAssigner({
      defaultTaskDuration: 7,
      minTaskComplexity: 1,
      maxTaskComplexity: 5,
    });
  });

  describe('assignTask', () => {
    it('应该根据争鸣层分析结果选择合适的任务类型', async () => {
      // Arrange
      const debate = createMockDebate({
        analysis: {
          healthScore: 85,
          concessionAbility: 80,
          riskAppetite: 70,
          decisionStyle: { userA: 'analytical', userB: 'intuitive' },
          disagreementType: [],
        },
        relationshipSuggestion: 'cofounder',
      });
      const userA = createMockUser({ id: 'user-a', name: '用户A' });
      const userB = createMockUser({ id: 'user-b', name: '用户B' });

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.task.taskType).toBeDefined();
      expect(['co_write', 'co_demo', 'co_collaboration']).toContain(recommendation.task.taskType);
    });

    it('应该生成包含用户名称的任务描述', async () => {
      // Arrange
      const debate = createMockDebate();
      const userA = createMockUser({ id: 'user-a', name: '张三' });
      const userB = createMockUser({ id: 'user-b', name: '李四' });

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.task.taskDescription).toContain('张三');
      expect(recommendation.task.taskDescription).toContain('李四');
    });

    it('任务复杂度应该在配置范围内', async () => {
      // Arrange
      const debate = createMockDebate();
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.task.complexity).toBeGreaterThanOrEqual(1);
      expect(recommendation.task.complexity).toBeLessThanOrEqual(5);
    });

    it('应该生成合理的预估时间', async () => {
      // Arrange
      const debate = createMockDebate();
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.task.estimatedHours).toBeGreaterThan(0);
      expect(recommendation.task.estimatedHours).toBeLessThanOrEqual(40); // 不超过40小时
    });

    it('应该生成推荐理由', async () => {
      // Arrange
      const debate = createMockDebate({
        analysis: {
          healthScore: 80,
          concessionAbility: 75,
          riskAppetite: 65,
          decisionStyle: { userA: 'analytical', userB: 'intuitive' },
          disagreementType: [],
        },
        relationshipSuggestion: 'cofounder',
      });
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.rationale).toBeDefined();
      expect(recommendation.rationale.length).toBeGreaterThan(0);
      expect(recommendation.rationale).toContain('你们在争鸣层');
    });

    it('应该计算适配度评分', async () => {
      // Arrange
      const debate = createMockDebate({
        analysis: {
          healthScore: 85,
          concessionAbility: 80,
          riskAppetite: 70,
          decisionStyle: { userA: 'analytical', userB: 'analytical' },
          disagreementType: [],
        },
      });
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.fitScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.fitScore).toBeLessThanOrEqual(100);
    });

    it('应该识别风险等级', async () => {
      // Arrange
      const highRiskDebate = createMockDebate({
        analysis: {
          healthScore: 50,
          concessionAbility: 45,
          riskAppetite: 85,
          decisionStyle: { userA: 'intuitive', userB: 'analytical' },
          disagreementType: ['approach', 'priority', 'values'],
        },
      });
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(highRiskDebate, userA, userB);

      // Assert
      expect(recommendation.riskLevel).toMatch(/low|medium|high/);
    });

    it('应该识别前置条件', async () => {
      // Arrange
      const debate = createMockDebate();
      const userA = createMockUser();
      const userB = createMockUser();

      // Act
      const recommendation = await assigner.assignTask(debate, userA, userB);

      // Assert
      expect(recommendation.prerequisites).toBeInstanceOf(Array);
      expect(recommendation.prerequisites.length).toBeGreaterThan(0);
      expect(recommendation.prerequisites).toContain('双方确认接受共试任务');
    });
  });
});

// 辅助函数
function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-123',
    roundId: 'round-456',
    userAId: 'user-a',
    userBId: 'user-b',
    complementarityScore: 80,
    futureGenerativity: 85,
    overallScore: 82.5,
    relationshipType: 'cofounder',
    matchReason: '高度互补的技能组合',
    complementarityAreas: ['技术', '产品'],
    insights: ['有很好的合作潜力'],
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockDebate(overrides: Partial<Debate> = {}): Debate {
  return {
    id: 'debate-123',
    matchId: 'match-456',
    scenario: '创业合作场景',
    questions: [],
    responses: [],
    analysis: {
      concessionAbility: 75,
      boundaryAwareness: 80,
      riskAppetite: 65,
      decisionStyle: {
        userA: 'analytical',
        userB: 'intuitive',
      },
      disagreementType: ['approach'],
      healthScore: 78,
    },
    relationshipSuggestion: '建议成为共创搭子',
    shouldConnect: true,
    riskAreas: ['决策风格差异'],
    nextSteps: ['进入共试层', '选择协作任务'],
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'user@example.com',
    name: '测试用户',
    avatar: null,
    secondmeId: 'secondme-123',
    interests: ['AI', '教育'],
    connectionTypes: ['cofounder', 'peer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// AI 集成测试 - Minimax 调用
// ============================================

describe('TaskAssigner AI Integration', () => {
  let assigner: TaskAssigner;
  let mockMinimaxClient: any;

  beforeEach(() => {
    // 创建 mock 客户端
    mockMinimaxClient = {
      chatJSON: vi.fn(),
      chat: vi.fn(),
    };

    vi.mocked(getMinimaxClient).mockReturnValue(mockMinimaxClient as any);

    assigner = new TaskAssigner({
      defaultTaskDuration: 7,
      minTaskComplexity: 1,
      maxTaskComplexity: 5,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMinimaxClient();
  });

  it('应使用 Minimax 生成个性化任务描述', async () => {
    // Arrange
    const debate = createMockDebate({
      relationshipSuggestion: 'cofounder',
      analysis: {
        healthScore: 85,
        concessionAbility: 80,
        riskAppetite: 70,
        decisionStyle: { userA: 'analytical', userB: 'intuitive' },
        disagreementType: [],
      },
    });
    const userA = createMockUser({ name: '张三', expertise: ['AI', '技术'] });
    const userB = createMockUser({ name: '李四', expertise: ['产品', '设计'] });

    // Mock Minimax 返回
    mockMinimaxClient.chatJSON.mockResolvedValue({
      taskType: 'co_collaboration',
      taskDescription: '张三和李四一起开发一个AI教育产品原型',
      taskGoal: '验证双方在产品设计和技术实现上的协作能力',
      complexity: 4,
      estimatedHours: 20,
      deliverables: ['产品原型', '技术方案', '演示视频'],
      successCriteria: ['按时交付', '双方满意', '可演示'],
    });

    // Act
    const recommendation = await assigner.assignTask(debate, userA, userB);

    // Assert - 验证 Minimax 被调用
    expect(mockMinimaxClient.chatJSON).toHaveBeenCalled();
    expect(recommendation.task.taskDescription).toContain('张三');
  });

  it('当 Minimax API 失败时应使用规则引擎兜底', async () => {
    // Arrange
    const debate = createMockDebate();
    const userA = createMockUser({ name: '张三' });
    const userB = createMockUser({ name: '李四' });

    // Mock Minimax 抛出异常
    mockMinimaxClient.chatJSON.mockRejectedValue(new Error('API Error'));

    // Act
    const recommendation = await assigner.assignTask(debate, userA, userB);

    // Assert - 应该返回规则引擎的结果
    expect(recommendation.task).toBeDefined();
    expect(recommendation.task.taskType).toBeDefined();
    expect(recommendation.riskLevel).toBeDefined();
  });

  it('应根据用户专业背景定制任务', async () => {
    // Arrange
    const debate = createMockDebate({
      analysis: {
        healthScore: 80,
        concessionAbility: 75,
        riskAppetite: 65,
        decisionStyle: { userA: 'analytical', userB: 'collaborative' },
        disagreementType: [],
      },
    });
    const userA = createMockUser({
      name: '技术专家王',
      interests: ['后端开发', '架构设计', 'AI算法']
    });
    const userB = createMockUser({
      name: '产品经理赵',
      interests: ['产品设计', '用户研究', '增长运营']
    });

    // Mock Minimax
    mockMinimaxClient.chatJSON.mockResolvedValue({
      taskType: 'co_collaboration',
      taskDescription: '技术专家王和产品经理赵共同打造一个AI驱动的内容推荐系统',
      taskGoal: '验证技术和产品思维的碰撞能否产生创新',
      complexity: 4,
      estimatedHours: 24,
      deliverables: ['产品方案', '技术原型', 'Demo演示'],
      successCriteria: ['功能完整', '用户体验良好', '技术可行'],
    });

    // Act
    const recommendation = await assigner.assignTask(debate, userA, userB);

    // Assert
    expect(mockMinimaxClient.chatJSON).toHaveBeenCalled();
    const callArgs = mockMinimaxClient.chatJSON.mock.calls[0];
    const userPrompt = callArgs[1] as string;

    // 验证 prompt 包含用户专业背景
    expect(userPrompt).toContain('后端开发');
    expect(userPrompt).toContain('产品设计');
  });
});
