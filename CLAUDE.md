# 知遇圆桌 - BDD 架构文档

> **架构原则**: BDD (行为驱动开发) + TDD (测试驱动实现) + 审计追踪
> **数据层**: Supabase (PostgreSQL + Realtime)
> **核心目标**: 可验证、可审计、高可靠的高价值连接系统

---

## 1. BDD 架构设计

### 1.1 核心行为场景 (Gherkin)

```gherkin
# 伯乐层 - 关系发现
Feature: 伯乐层发现高价值连接
  As a 用户
  I want 让我的Agent参与圆桌讨论
  So that 发现本不该错过的人

  Scenario: Agent参与圆桌并生成知遇卡
    Given 用户已登录并创建Personal Agent
    And 圆桌"AI与职业"已创建并激活
    When 用户的Agent参与圆桌讨论
    And 讨论时长超过5分钟
    Then 系统应分析讨论内容
    And 生成1-3张知遇卡
    And 知遇卡应包含互补性评分

# 争鸣层 - 关系验证
Feature: 争鸣层验证合作可行性
  As a 收到知遇卡的用户
  I want 与对方进行结构化对练
  So that 验证我们能否一起做成事

  Scenario: 双方完成争鸣层对练
    Given 用户A和用户B都接受了知遇卡
    And 双方都同意进入争鸣层
    When 系统生成3个高风险问题
    And 双方各自回答问题
    Then 系统应分析回答内容
    And 输出关系类型建议
    And 标注风险领域

# 共试层 - 关系落地
Feature: 共试层低成本验证
  As a 完成争鸣层的双方
  I want 执行最小化共试任务
  So that 在真实协作中验证关系

  Scenario: 成功完成共试任务
    Given 双方接受关系建议并同意共试
    When 系统分配共试任务(如共写一篇知乎回答)
    And 双方在7天内完成任务
    Then 系统应记录共试结果
    And 双方可以互评
    And 成功共试的关系进入长期追踪
```

### 1.2 审计追踪设计

每个核心行为必须记录审计日志：

```typescript
// 审计日志 Schema
interface AuditLog {
  id: string;
  timestamp: string;           // ISO 8601
  action: AuditAction;       // 行为类型
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    sessionId?: string;
  };
  resource: {
    type: 'round' | 'match' | 'debate' | 'cotrial' | 'message';
    id: string;
  };
  context: {
    before: Record<string, any>;   // 变更前状态
    after: Record<string, any>;    // 变更后状态
    diff: string;                   // JSON Patch
  };
  metadata: {
    ip?: string;
    userAgent?: string;
    requestId: string;
    traceId: string;
  };
}

type AuditAction =
  | 'round.created' | 'round.joined' | 'round.left' | 'round.completed'
  | 'match.generated' | 'match.accepted' | 'match.declined'
  | 'debate.initiated' | 'debate.responded' | 'debate.completed'
  | 'cotrial.assigned' | 'cotrial.completed' | 'cotrial.rated';
```

---

## 2. TDD 实现规范

### 2.1 测试金字塔

```
    /\
   /  \      E2E (5%)   - 关键用户旅程
  /----\     ------------
 /      \    集成 (15%)  - API/服务边界
/--------\   ------------
          \  单元 (80%)   - 业务逻辑/工具函数
```

### 2.2 测试文件结构

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

### 2.3 单元测试示例

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

### 2.4 集成测试示例

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

## 3. Supabase 数据层设计

### 3.1 Schema 设计

```sql
-- 启用审计扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 审计日志表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id UUID NOT NULL,
  session_id UUID,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  context_before JSONB NOT NULL DEFAULT '{}',
  context_after JSONB NOT NULL DEFAULT '{}',
  diff JSONB,
  metadata JSONB,

  -- 索引
  CONSTRAINT audit_logs_action_check CHECK (action ~ '^[a-z]+\.[a-z]+$')
);

-- 审计日志索引
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  secondme_id TEXT UNIQUE,
  interests TEXT[],
  connection_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 表
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personality TEXT,
  expertise TEXT[],
  tone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 议题表
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  zhihu_id TEXT,
  zhihu_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 圆桌表
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id),
  name TEXT NOT NULL,
  description TEXT,
  max_agents INTEGER DEFAULT 5,
  status TEXT DEFAULT 'waiting',
  summary TEXT,
  insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 圆桌参与者表
CREATE TABLE round_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(round_id, user_id)
);

-- 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB,
  reply_to UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 知遇卡表
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id),
  user_a_id UUID REFERENCES users(id),
  user_b_id UUID REFERENCES users(id),
  complementarity_score DECIMAL(5,2),
  future_generativity DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  relationship_type TEXT,
  match_reason TEXT,
  complementarity_areas TEXT[],
  insights JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_a_id, user_b_id)
);

-- 争鸣层对练表
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  scenario TEXT,
  questions JSONB[],
  responses JSONB[],
  analysis JSONB,
  relationship_suggestion TEXT,
  should_connect BOOLEAN,
  risk_areas TEXT[],
  next_steps TEXT[],
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id)
);

-- 共试层任务表
CREATE TABLE cotrials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debate_id UUID REFERENCES debates(id),
  task_type TEXT,
  task_description TEXT,
  task_goal TEXT,
  task_duration TEXT,
  result TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  feedback_a JSONB,
  feedback_b JSONB,
  continued BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(debate_id)
);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debates_updated_at BEFORE UPDATE ON debates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cotrials_updated_at BEFORE UPDATE ON cotrials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 审计函数

```sql
-- 创建审计日志函数
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_actor_type TEXT,
  p_actor_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_context_before JSONB DEFAULT '{}',
  p_context_after JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_diff JSONB;
BEGIN
  -- 计算差异
  v_diff := jsonb_diff(p_context_before, p_context_after);

  -- 插入审计日志
  INSERT INTO audit_logs (
    action,
    actor_type,
    actor_id,
    resource_type,
    resource_id,
    context_before,
    context_after,
    diff,
    metadata
  ) VALUES (
    p_action,
    p_actor_type,
    p_actor_id,
    p_resource_type,
    p_resource_id,
    p_context_before,
    p_context_after,
    v_diff,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- JSONB 差异计算函数
CREATE OR REPLACE FUNCTION jsonb_diff(old JSONB, new JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  key TEXT;
BEGIN
  FOR key IN SELECT * FROM jsonb_object_keys(old || new)
  LOOP
    IF old->key IS DISTINCT FROM new->key THEN
      result := result || jsonb_build_object(
        key,
        jsonb_build_object(
          'old', old->key,
          'new', new->key
        )
      );
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 4. TDD 开发流程

### 4.1 开发循环

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

### 4.2 目录结构

```
zhiyu_roundtable/
├── features/                    # BDD Gherkin 场景
│   ├── bole/
│   │   └── discovery.feature
│   ├── zhengming/
│   │   └── validation.feature
│   └── gongshi/
│       └── trial.feature
│
├── lib/                         # 核心业务逻辑
│   ├── bole/
│   │   ├── __tests__/
│   │   │   ├── card-generator.test.ts
│   │   │   └── round-analyzer.test.ts
│   │   ├── card-generator.ts
│   │   └── round-analyzer.ts
│   │
│   ├── zhengming/
│   │   ├── __tests__/
│   │   │   ├── debate-engine.test.ts
│   │   │   └── question-generator.test.ts
│   │   ├── debate-engine.ts
│   │   └── question-generator.ts
│   │
│   ├── audit/
│   │   ├── __tests__/
│   │   │   └── logger.test.ts
│   │   ├── logger.ts
│   │   └── types.ts
│   │
│   └── supabase/
│       ├── client.ts
│       └── types.ts
│
├── app/                        # Next.js App Router
│   ├── api/                   # API 路由
│   │   ├── rounds/
│   │   ├── matches/
│   │   └── debates/
│   │
│   ├── (main)/
│   │   ├── rounds/
│   │   ├── matches/
│   │   └── profile/
│   │
│   └── login/
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

---

## 5. 配置更新

### 5.1 依赖更新

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "@cucumber/cucumber": "^10.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "playwright": "^1.40.0"
  }
}
```

---

## 6. 下一步行动

1. **初始化 Supabase 项目**
   - 创建 Supabase 项目
   - 运行 migrations
   - 配置 RLS 策略

2. **设置 TDD 环境**
   - 配置 Vitest
   - 编写第一个测试
   - 实现最小功能

3. **实现审计系统**
   - 创建 audit_logs 表
   - 实现自动审计触发器
   - 添加审计查询 API

4. **编写 BDD 场景**
   - 将需求转化为 Gherkin
   - 实现步骤定义
   - 运行端到端测试
