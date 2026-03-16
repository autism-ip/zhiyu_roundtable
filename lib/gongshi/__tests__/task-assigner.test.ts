/**
 * [INPUT]: 依赖 vitest 和 TaskAssigner
 * [OUTPUT]: 对外提供共试层任务分配器的 TDD 测试
 * [POS]: lib/gongshi/__tests__/task-assigner.test.ts - 共试层单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskAssigner, TaskAssignerConfig } from '../task-assigner';
import type { Debate, User } from '@/types';

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
