# TDD 实现规范

> 详细规范见 `tests/README.md`（本文件）

## 快速索引

| 内容 | 位置 |
|------|------|
| 测试金字塔 | 下方 2.1 |
| 测试文件结构 | 下方 2.2 |
| 单元测试示例 | 下方 2.3 |
| 集成测试示例 | 下方 2.4 |
| 开发循环 | 下方 9.1 |
| 目录结构 | 下方 9.2 |

---

## 2.1 测试金字塔

```
    /\
   /  \      E2E (5%)   - 关键用户旅程
  /----\     ------------
 /      \    集成 (15%)  - API/服务边界
/--------\   ------------
          \  单元 (80%)   - 业务逻辑/工具函数
```

## 2.2 测试文件结构

```
lib/
├── bole/                    # 伯乐层 - 关系发现
│   ├── card-generator.ts    # 知遇卡生成器
│   ├── card-generator.test.ts  # 单元测试
│   ├── round-analyzer.ts  # 圆桌分析器
│   └── round-analyzer.test.ts
│
├── zhengming/               # 争鸣层 - 关系验证
│   ├── debate-engine.ts     # 对练引擎
│   ├── debate-engine.test.ts
│   ├── question-generator.ts
│   └── response-analyzer.ts
│
├── gongshi/                 # 共试层 - 关系落地
│   ├── task-assigner.ts
│   └── task-evaluator.ts
│
├── audit/                   # 审计模块
│   ├── logger.ts            # 审计日志记录器
│   ├── logger.test.ts
│   └── types.ts
│
└── supabase/                # 数据层
    ├── client.ts
    ├── schemas.ts
    └── types.ts
```

## 2.3 单元测试示例

```typescript
// lib/bole/card-generator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardGenerator } from './card-generator';
import type { Round, Message, User } from '@/types';

describe('CardGenerator', () => {
  let generator: CardGenerator;

  beforeEach(() => {
    generator = new CardGenerator({
      minComplementarityScore: 60,
      maxMatchesPerRound: 3,
    });
  });

  describe('generateMatches', () => {
    it('当圆桌讨论不足5分钟时应返回空数组', async () => {
      // Arrange
      const round = createMockRound({ duration: 4 * 60 * 1000 }); // 4分钟

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toEqual([]);
    });

    it('当互补性评分低于阈值时应过滤掉', async () => {
      // Arrange
      const round = createMockRound({
        duration: 10 * 60 * 1000,
        messages: createComplementaryMessages(55), // 55分，低于60
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toEqual([]);
    });

    it('应返回按评分排序的知遇卡', async () => {
      // Arrange
      const round = createMockRound({
        duration: 15 * 60 * 1000,
        messages: createMixedMessages(),
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches).toHaveLength(3);
      expect(matches[0].complementarityScore).toBeGreaterThanOrEqual(
        matches[1].complementarityScore
      );
      expect(matches[1].complementarityScore).toBeGreaterThanOrEqual(
        matches[2].complementarityScore
      );
    });

    it('知遇卡应包含必需的元数据', async () => {
      // Arrange
      const round = createMockRound({
        duration: 10 * 60 * 1000,
        messages: createComplementaryMessages(85),
      });

      // Act
      const matches = await generator.generateMatches(round);

      // Assert
      expect(matches[0]).toMatchObject({
        id: expect.any(String),
        userAId: expect.any(String),
        userBId: expect.any(String),
        complementarityScore: expect.any(Number),
        futureGenerativity: expect.any(Number),
        relationshipType: expect.stringMatching(/peer|cofounder|opponent|advisor|none/),
        matchReason: expect.any(String),
        insights: expect.any(Array),
      });
    });
  });
});

// 辅助函数
function createMockRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-123',
    topicId: 'topic-456',
    name: '测试圆桌',
    status: 'completed',
    participantCount: 5,
    messageCount: 50,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Round;
}

function createComplementaryMessages(score: number): Message[] {
  // 模拟互补性消息
  return [
    { id: '1', userId: 'user-a', content: '我认为AI会改变教育...', type: 'text' },
    { id: '2', userId: 'user-b', content: '但从技术实现角度...', type: 'text' },
    // ...更多消息
  ] as Message[];
}

function createMixedMessages(): Message[] {
  // 模拟多种互补性的消息
  return createComplementaryMessages(85);
}
```

## 2.4 集成测试示例

```typescript
// tests/integration/bole-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Round, User, Match } from '@/types';

describe('伯乐层完整流程', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let testUsers: User[];
  let testRound: Round;

  beforeAll(async () => {
    // 创建测试用户
    testUsers = await Promise.all([
      createTestUser({ name: '测试用户A', expertise: ['AI', '教育'] }),
      createTestUser({ name: '测试用户B', expertise: ['技术', '产品'] }),
    ]);

    // 创建测试圆桌
    testRound = await createTestRound({
      name: 'AI与未来教育',
      participants: testUsers.map(u => u.id),
    });
  });

  it('完整流程：圆桌讨论 → 生成知遇卡 → 数据审计', async () => {
    // Step 1: 模拟圆桌讨论
    const messages = await simulateRoundDiscussion(testRound.id, [
      { userId: testUsers[0].id, content: 'AI会彻底改变教育方式...' },
      { userId: testUsers[1].content: '但技术实现上还有挑战...' },
      // ...更多消息
    ]);

    expect(messages).toHaveLengthGreaterThan(10);

    // Step 2: 触发伯乐层分析
    const { data: matches, error } = await supabase.functions.invoke('bole-analyze', {
      body: { roundId: testRound.id },
    });

    expect(error).toBeNull();
    expect(matches).toBeInstanceOf(Array);
    expect(matches.length).toBeGreaterThan(0);

    // Step 3: 验证知遇卡数据完整性
    const match = matches[0];
    expect(match).toMatchObject({
      id: expect.any(String),
      roundId: testRound.id,
      userAId: expect.any(String),
      userBId: expect.any(String),
      complementarityScore: expect.any(Number),
      relationshipType: expect.stringMatching(/peer|cofounder|opponent|advisor|none/),
    });

    // Step 4: 审计验证 - 检查所有操作是否被记录
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource->>type', 'round')
      .eq('resource->>id', testRound.id)
      .order('timestamp', { ascending: true });

    expect(auditLogs.length).toBeGreaterThan(0);

    // 验证审计链完整性
    const expectedActions = [
      'round.created',
      'round.joined',
      'message.created',
      'round.completed',
      'match.generated',
    ];

    const actualActions = auditLogs.map(log => log.action);

    for (const action of expectedActions) {
      expect(actualActions).toContain(action);
    }

    // Step 5: 数据一致性验证
    const { data: roundCheck } = await supabase
      .from('rounds')
      .select('*, matches(*)')
      .eq('id', testRound.id)
      .single();

    expect(roundCheck.matches).toHaveLength(matches.length);
    expect(roundCheck.status).toBe('completed');
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(testRound.id, testUsers.map(u => u.id));
  });
});
```

---

## 9. TDD 开发流程

### 9.1 开发循环

```
1. 编写 Gherkin 场景 (.feature)
        ↓
2. 运行测试 → 应该失败 (RED)
        ↓
3. 编写最小实现代码
        ↓
4. 运行测试 → 应该通过 (GREEN)
        ↓
5. 重构代码 (IMPROVE)
        ↓
6. 添加审计日志
        ↓
7. 提交代码
```

### 9.2 目录结构

```
zhiyu_roundtable/
├── features/                    # BDD Gherkin 场景
│   ├── entry/
│   │   └── agent-mode.feature
│   ├── bole/
│   │   └── discovery.feature
│   ├── zhengming/
│   │   └── validation.feature
│   └── gongshi/
│       └── simulation.feature
│
├── lib/                         # 核心业务逻辑
│   ├── entry/                   # 入口层
│   │   ├── agent-mode.ts       # Agent模式管理
│   │   └── a2a-client.ts       # A2A协议客户端
│   │
│   ├── bole/                    # 伯乐层
│   │   ├── __tests__/
│   │   │   ├── card-generator.test.ts
│   │   │   └── round-analyzer.test.ts
│   │   ├── card-generator.ts   # 知遇卡生成
│   │   └── round-analyzer.ts   # 圆桌分析
│   │
│   ├── zhengming/               # 争鸣层
│   │   ├── __tests__/
│   │   │   ├── debate-engine.test.ts
│   │   │   └── question-generator.test.ts
│   │   ├── debate-engine.ts    # 对练引擎
│   │   └── question-generator.ts
│   │
│   ├── gongshi/                 # 共试层
│   │   ├── simulation-engine.ts # 剧情模拟引擎
│   │   └── task-assigner.ts    # 任务分配
│   │
│   ├── user/                    # 用户服务
│   │   ├── user-service.ts
│   │   └── reputation.ts       # 信誉系统
│   │
│   ├── memory/                  # 回忆功能
│   │   └── timeline.ts
│   │
│   ├── audit/                   # 审计模块
│   │   ├── __tests__/
│   │   │   └── logger.test.ts
│   │   ├── logger.ts
│   │   └── types.ts
│   │
│   ├── ai/                      # AI服务
│   │   └── minimax-client.ts   # MiniMax客户端
│   │
│   └── supabase/                # 数据层
│       ├── client.ts
│       └── types.ts
│
├── app/                        # Next.js App Router
│   ├── api/                   # API 路由
│   │   ├── rounds/
│   │   ├── matches/
│   │   ├── debates/
│   │   ├── cotrials/
│   │   └── users/
│   │
│   ├── (main)/
│   │   ├── rounds/            # 圆桌讨论页
│   │   ├── matches/          # 知遇卡页
│   │   ├── debates/          # 争鸣对练页
│   │   ├── cotrials/         # 共试模拟页
│   │   ├── profile/          # 用户画像页
│   │   └── square/           # 社区广场页
│   │
│   └── login/                 # 登录页
│
├── components/                # UI组件
│   ├── entry/                 # 入口层组件
│   ├── bole/                 # 伯乐层组件
│   ├── zhengming/            # 争鸣层组件
│   ├── gongshi/              # 共试层组件
│   └── ui/                   # 通用UI组件
│
├── tests/                      # 集成/E2E 测试
│   ├── integration/
│   │   └── bole-flow.test.ts
│   └── e2e/
│       └── user-journey.spec.ts
│
├── vitest.config.ts
└── playwright.config.ts
```
