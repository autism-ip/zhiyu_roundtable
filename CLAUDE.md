# 知遇圆桌 - A2A 黑客松架构文档

> **架构原则**: BDD (行为驱动开发) + TDD (测试驱动实现) + 审计追踪
> **数据层**: Supabase (PostgreSQL + Realtime)
> **核心协议**: A2A (Google Agent-to-Agent) + MCP (Anthropic Model Context Protocol)
> **身份认证**: SecondMe OAuth
> **内容生态**: 知乎
> **核心目标**: 可验证、可审计、高可靠的高价值连接系统

---

## 0. 整体架构 (2026 黑客 松版)

> **开发模式**: 多Agent并行研究模式 - 当需要研究多个独立技术主题时，并行启动Explore agent，每个负责一个主题，减少主agent上下文消耗

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户入口层                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────┐│
│  │  人类模式       │    │  Agent 模式                                      ││
│  │  - 查看附近Agent │    │  - 设定目标 → Agent自动匹配/对话               ││
│  │  - 手动选择对话  │    │  - 持续自主行动 + 人类随时干预                  ││
│  │  - 自主操控Agent │    │  - 行为日志可追溯                               ││
│  └─────────────────┘    └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          伯乐层 (发现)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  圆桌讨论 → AI分析 → 生成知遇卡 (互补性评分 + 关系类型 + 匹配理由)    ││
│  │  - 数据源: 知乎热点问题 / 自定义问题 / Agent生成问题                   ││
│  │  - 参与者: N人圆桌 (动态加入/退出)                                     ││
│  │  - 匹配逻辑: 互补性 + 未来生成性 + 关系类型预测                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          争鸣层 (验证)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  结构化多轮对练 → 风险评估 → 关系建议                                 ││
│  │  - 形式: N人圆桌讨论 (非一对一)                                       ││
│  │  - 问题: 由争鸣结果决定的问题数量与复杂度                              ││
│  │  - 输出: 关系类型建议 + 风险领域 + 下一步行动                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          共试层 (落地)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  实时剧情模拟 → 人类干预 → 反馈总结                                   ││
│  │  - 形式: Agent模拟剧情走向，关键时刻人类选择                          ││
│  │  - 干预方式: 旁观 / 提示 / 中断                                       ││
│  │  - 模拟时长: 由争鸣层结果决定                                         ││
│  │  - 输出: 模拟结果报告 + 行为数据                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          辅助功能                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 回忆功能  │ │ 信誉系统  │ │ 安全控制 │ │ 社区广场 │ │ 成长体系 │    │
│  │ 时间线形式│ │ 能力标签  │ │ 权限分级 │ │ 信息流   │ │ 积分成就 │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. 入口层设计

### 1.1 Agent 模式开关

```typescript
interface AgentMode {
  mode: 'human' | 'agent';
  agentId?: string;
  autoAction: boolean;      // Agent是否自动行动
  humanIntervention: boolean; // 人类是否可随时干预
  behaviorLogging: boolean;  // 是否记录行为日志
}

// 人类模式
{
  mode: 'human',
  autoAction: false,
  humanIntervention: false,
}

// Agent模式 - 完全自主
{
  mode: 'agent',
  agentId: 'agent-123',
  autoAction: true,
  humanIntervention: false,  // 关闭干预，仅事后查看
}

// Agent模式 - 可干预
{
  mode: 'agent',
  agentId: 'agent-123',
  autoAction: true,
  humanIntervention: true,  // 允许随时干预
}
```

### 1.2 A2A 协议集成

#### 1.2.1 Agent Card 定义

```typescript
// Agent Card 部署路径: /.well-known/agent-card.json
interface AgentCard {
  name: string;                    // 人类可读名称
  description: string;             // Agent 功能描述
  url: string;                     // A2A 端点 URL (必须 HTTPS)
  version: string;                  // 语义版本 (如 "1.0.0")
  provider?: {                      // 提供者信息
    organization: string;
    contactEmail?: string;
  };
  capabilities: {
    streaming: boolean;             // 是否支持 SSE 流式
    pushNotifications: boolean;    // 是否支持推送
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    inputModes: string[];
    outputModes: string[];
  }>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
}
```

#### 1.2.2 A2A Server 实现

```typescript
// app/api/a2a/route.ts
import { AgentExecutor, DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk';

class ZhiyuAgentExecutor implements AgentExecutor {
  async executeTask(context: RequestContext, task: Task): Promise<void> {
    const userMessage = this.extractText(task.message);
    const result = await this.analyzeRound(userMessage);
    await context.sendMessage({
      role: 'agent',
      parts: [{ type: 'text', text: JSON.stringify(result) }],
    });
  }
}

const taskStore = new InMemoryTaskStore();
const agentExecutor = new ZhiyuAgentExecutor();

// JSON-RPC 端点
export async function POST(req: NextRequest) {
  const body = await req.json();
  // 处理 A2A 请求
}

// Agent Card 端点
export async function GET() {
  return NextResponse.json(agentCard);
}
```

#### 1.2.3 A2A Client 实现

```typescript
// lib/a2a/client.ts
import { ClientFactory } from '@a2a-js/sdk';

class A2AClientManager {
  private clients = new Map<string, any>();

  async getClient(agentUrl: string) {
    if (!this.clients.has(agentUrl)) {
      const factory = new ClientFactory();
      const client = await factory.createFromUrl(agentUrl);
      this.clients.set(agentUrl, client);
    }
    return this.clients.get(agentUrl);
  }

  async sendMessage(agentUrl: string, content: string) {
    const client = await this.getClient(agentUrl);
    const response = await client.sendMessage({
      messageId: crypto.randomUUID(),
      message: { role: 'user', parts: [{ type: 'text', text: content }] },
    });
    return this.extractResponse(response);
  }

  // 流式响应
  async *streamMessage(agentUrl: string, content: string) {
    const client = await this.getClient(agentUrl);
    const stream = await client.sendMessageStreaming({
      messageId: crypto.randomUUID(),
      message: { role: 'user', parts: [{ type: 'text', text: content }] },
    });
    for await (const event of stream) {
      if (event.message?.parts) {
        yield event.message.parts.map(p => p.text).join('');
      }
    }
  }
}
```

#### 1.2.4 通信模式选择

| 模式 | 适用场景 | SDK 方法 |
|------|----------|----------|
| **Message/send** | 单次请求-响应 | `client.sendMessage()` |
| **Task/send** | 长时间任务，可追踪状态 | `client.createTask()` |
| **Streaming** | 需要实时反馈 | `client.sendMessageStreaming()` |

#### 1.2.5 常见错误与解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `401 Unauthorized` | 缺少 securitySchemes 或认证信息错误 | 检查 `Authorization` 头 |
| `404 Not Found` | Agent Card 路径错误 | 确认 `/.well-known/agent-card.json` 可访问 |
| `streaming not supported` | Agent 不支持 SSE | 检查 `capabilities.streaming` |

```typescript
// A2A Client 实现
import { AgentCard, A2AClient } from '@anthropic-ai/a2a-protocol';

const agentCard: AgentCard = {
  name: '知遇Agent',
  version: '1.0',
  capabilities: {
    streaming: true,
    pushNotifications: true,
  },
  skills: ['圆桌讨论', '匹配分析', '对练模拟'],
};
```

---

## 2. 伯乐层 (发现层)

### 2.1 圆桌讨论

- **问题来源**: 知乎热点问题 / 自定义问题 / Agent生成问题
- **参与形式**: N人圆桌，支持动态加入/退出
- **匹配时机**: 讨论时长超过5分钟触发分析

#### 2.1.1 多Agent讨论系统架构

**推荐框架**: **AutoGen** (Microsoft) + **Swarms**

| 模式 | 适用场景 |
|------|----------|
| **RoundTableDiscussion** | 开放圆桌讨论 |
| **ExpertPanelDiscussion** | 多专家+主持人 |
| **OneOnOneDebate** | 一对一辩论 |

```typescript
// 圆桌讨论系统架构
class RoundTableDiscussion {
  private agents: PersonaAgent[];
  private topic: Topic;
  private maxRounds: number = 10;

  async start() {
    // 1. 初始化Persona Agents
    await Promise.all(this.agents.map(a => a.loadPersona()));

    // 2. 圆桌对话循环
    for (let round = 0; round < this.maxRounds; round++) {
      for (const agent of this.agents) {
        const response = await agent.respond(this.getContext());
        await this.record(response);

        // 检查是否触发分析时机
        if (this.shouldAnalyze()) {
          await this.triggerBoleAnalysis();
        }
      }
    }
  }
}
```

#### 2.1.2 实时对话实现

**技术选型**: Supabase Realtime + SSE流式响应

```typescript
// 前端: 使用Supabase Realtime订阅
const channel = supabase
  .channel(`round:${roundId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `round_id=eq.${roundId}` },
    (payload) => appendMessage(payload.new)
  )
  .subscribe()

// 后端流式响应
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
        method: 'POST',
        body: JSON.stringify({ model: 'abab6.5s-chat', messages, stream: true })
      })
      for await (const chunk of response.body) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

#### 2.1.3 角色分配算法

```typescript
interface AgentCapability {
  agentId: string
  strengths: string[]      // 擅长领域
  personality: string      // 性格特征
  expertise: number[]     // 专业评分
}

function assignRoles(candidates: AgentCapability[], topic: Topic): RoleAssignment[] {
  // 1. 计算topic与agent的匹配度
  const scores = candidates.map(agent => ({
    agentId: agent.agentId,
    score: calculateMatchScore(agent, topic)
  }))
  // 2. 选择最合适的agent for each role
  // 3. 处理冲突
  return resolveConflicts(scores, availableRoles)
}
```

### 2.2 知遇卡生成

```typescript
interface MatchCard {
  id: string;
  roundId: string;
  userAId: string;
  userBId: string;
  complementarityScore: number;   // 互补性评分 (0-100)
  futureGenerativity: number;    // 未来生成性 (0-100)
  overallScore: number;           // 综合评分
  relationshipType: RelationshipType;
  matchReason: string;
  complementarityAreas: string[]; // 互补领域
  insights: Insight[];
  status: MatchStatus;
}

type RelationshipType =
  | 'peer'       // 同伴
  | 'cofounder'  // 联合创始人
  | 'opponent'   // 对手
  | 'advisor'    // 导师
  | 'mentee'     // 学徒
  | 'none';      // 无匹配

type MatchStatus = 'pending' | 'accepted' | 'declined' | 'expired';
```

#### 2.2.1 互补性评分算法

**核心思路**: 差异产生价值，而非相似性

```typescript
interface ComplementarityInput {
  userA: {
    expertise: string[];
    personality: Personality;
    collaborationStyle: string;
    goals: string[];
  };
  userB: Personality & { expertise: string[]; goals: string[] };
}

function calculateComplementarity(input: ComplementarityInput): number {
  // 1. 专业互补性：领域不重叠 = 高互补
  const expertiseOverlap = intersection(input.userA.expertise, input.userB.expertise).length;
  const expertiseScore = 1 - (expertiseOverlap / Math.max(
    input.userA.expertise.length,
    input.userB.expertise.length
  ));

  // 2. 性格互补性：MBTI/Big Five 互补维度
  const personalityScore = calculatePersonalityComplementarity(
    input.userA.personality,
    input.userB.personality
  );

  // 3. 目标协同性：目标有交集但不完全相同
  const goalAlignment = calculateGoalAlignment(input.userA.goals, input.userB.goals);

  // 加权综合
  return expertiseScore * 0.4 + personalityScore * 0.35 + goalAlignment * 0.25;
}
```

#### 2.2.2 未来生成性评估

```typescript
interface FutureGenerativityInput {
  userA: { expertise: string[]; connections: string[]; creativityScore: number };
  userB: { expertise: string[]; connections: string[]; creativityScore: number };
  jointDiscussion: Message[];
}

function evaluateFutureGenerativity(input: FutureGenerativityInput): number {
  // 1. 知识网络扩展潜力
  const networkExpansion = calculateNetworkExpansion(input.userA.connections, input.userB.connections);

  // 2. 创意产出质量
  const creativeOutput = analyzeCreativeQuality(input.jointDiscussion);

  // 3. 协作创造力兼容性
  const creativityCompatibility = Math.abs(input.userA.creativityScore - input.userB.creativityScore) < 2
    ? 1.0
    : 0.5;

  return (networkExpansion * 0.4 + creativeOutput * 0.4 + creativityCompatibility * 0.2);
}
```

#### 2.2.3 关系类型预测

| 类型 | 预测特征 |
|------|----------|
| **peer** | 相似专业 + 相似经验 + 平等目标 (expertise相似度>0.7, 经验等级差<2) |
| **cofounder** | 互补技能 + 共同愿景 + 风险承担意愿 |
| **opponent** | 相似领域 + 冲突目标 + 竞争风格 |
| **advisor** | 经验值>另一方2倍 + 指导意愿 |
| **mentee** | 经验少 + 主动提问多 + 成长心态 |

#### 2.2.4 推荐系统评估指标

```typescript
interface EvaluationMetrics {
  precisionAtK: (predictions: Match[], groundTruth: Match[], k: number) => number;
  recallAtK: (predictions: Match[], groundTruth: Match[], k: number) => number;
  f1Score: (predictions: Match[], groundTruth: Match[], k: number) => number;
  auc: (scores: number[], labels: boolean[]) => number;
}
```

---

## 3. 争鸣层 (验证层)

### 3.1 多轮圆桌讨论

- **人数**: N人圆桌，非一对一
- **问题数量**: 由匹配质量决定 (2-5个)
- **复杂度**: 由争鸣结果动态调整

#### 3.1.1 角色扮演AI实现

```typescript
interface Persona {
  // 核心特征
  personality: {
    traits: string[];           // Big Five: openness, conscientiousness...
    values: string[];           // 核心价值观
    beliefs: string[];         // 信念体系
  };

  // 行为模式
  communication: {
    tone: 'formal' | 'casual' | 'aggressive' | 'diplomatic';
    style: 'analytical' | 'emotional' | 'pragmatic' | 'creative';
    verbalTics?: string[];     // 口头禅
  };

  // 专业背景
  expertise: string[];
  background: string;

  // 观点倾向
  perspectives: {
    topic: string;
    stance: 'support' | 'oppose' | 'neutral';
    reasoning: string;
  }[];
}
```

#### 3.1.2 观点分析Prompt

```markdown
## 任务: 观点分析

### 输入
对话文本: {discussion_text}

### 分析要求
1. 立场识别: 每个参与者的核心观点是什么？
2. 论据提取: 支持/反对的核心论据
3. 逻辑结构: 论证链条是否有效
4. 情感倾向: 积极/消极/中性
5. 互补领域: 不同观点之间的互补点

### 输出格式 (JSON)
{
  "participants": [{
    "id": "user_A",
    "mainPosition": "string",
    "keyArguments": ["string"],
    "reasoningQuality": "high|medium|low"
  }],
  "complementarityAreas": ["string"],
  "consensusPoints": ["string"]
}
```

#### 3.1.3 风险评估Prompt

```markdown
## 任务: 合作关系风险评估

### 评估维度
1. 目标一致性 (0-100)
2. 价值观兼容性 (0-100)
3. 能力互补性 (0-100)
4. 沟通模式兼容性 (0-100)

### 输出
{
  "overallCompatibility": number,
  "riskAreas": [{
    "area": "string",
    "severity": "high|medium|low",
    "description": "string",
    "mitigation": "string"
  }],
  "relationshipSuggestion": "peer|cofounder|opponent|advisor|mentee|none",
  "nextSteps": ["string"]
}
```

### 3.2 关系验证输出

```typescript
interface DebateResult {
  id: string;
  matchId: string;
  relationshipSuggestion: RelationshipType;
  shouldConnect: boolean;
  riskAreas: string[];
  nextSteps: string[];
  analysis: {
    alignment: number;
    conflictPotential: number;
    collaborationScore: number;
  };
}
```

---

## 4. 共试层 (落地层)

### 4.1 实时剧情模拟

#### 4.1.1 LLM + Behavior Tree 混合架构

```
┌─────────────────────┐
│   LLM 叙事引擎      │  ← 说什么（内容生成）
│   场景描述/对话生成 │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  BT 行为控制器       │  ← 做什么（行为选择）
│  状态转换/动作决策   │
└─────────────────────┘
```

**核心思路**: LLM负责创意生成，BT负责行为控制，两者互补

#### 4.1.2 状态机设计

```typescript
interface SimulationEngine {
  state: 'idle' | 'running' | 'paused' | 'completed';

  initialize(config: SimulationConfig): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<SimulationResult>;

  intervene(level: InterventionLevel, action: InterventionAction): void;
  evaluate(): Promise<SimulationMetrics>;
}

interface SimulationConfig {
  duration: number;           // 模拟时长 (争鸣层决定)
  scenario: string;          // 初始场景设定
  interventionLevels: InterventionLevel[];
  metrics: Metric[];
}

type InterventionLevel = 'observe' | 'suggest' | 'interrupt';

interface SimulationMetrics {
  trust: number;           // 信任度
  alignment: number;       // 一致性
  conflict: number;        // 冲突值
  creativity: number;      // 创造力
  outcome: number;         // 结果评分
  coherence: number;       // 连贯性
}
```

#### 4.1.3 多Agent状态管理

```
┌─────────────────────────────────────────────────┐
│                    全局状态层                   │
│  - 场景世界状态 (scene state)                 │
│  - 时间/天气/事件流                            │
│  - 共享记忆 (shared memory)                   │
├─────────────────────────────────────────────────┤
│                   Agent 私有状态                │
│  - 角色心理状态 (beliefs, goals, emotions)   │
│  - 短期记忆 (working memory - 当前对话)       │
│  - 长期记忆 (episodic memory - 历史交互)      │
├─────────────────────────────────────────────────┤
│                   协调状态层                   │
│  - Agent间关系图谱                             │
│  - 通信协议/意图广播                           │
│  - 冲突检测/ resolution                       │
└─────────────────────────────────────────────────┘
```

#### 4.1.4 干预协议设计

```typescript
interface Intervention {
  level: 'observe' | 'suggest' | 'interrupt';
  timestamp: Date;
  userId: string;
  content?: string;      // 提示内容
  reason?: string;       // 中断原因
  agentResponse?: {      // Agent对干预的反应
    adopted: boolean;
    reasoning: string;
  };
}
```

| 层级 | 触发条件 | Agent响应 | 技术实现 |
|------|----------|-----------|----------|
| **旁观** | 自动 | Agent持续模拟，实时推送状态 | WebSocket流式推送 + 状态快照 |
| **提示** | 用户输入 | Agent可选择采纳/忽略 | 消息队列注入 + 采纳率记录 |
| **中断** | 强制停止 | 暂停模拟，等待人类输入 | 状态冻结 + 上下文保存 |

### 4.2 人类干预方式

| 层级 | 触发条件 | Agent响应 |
|------|----------|-----------|
| 旁观 | 自动 | Agent持续模拟，不暂停 |
| 提示 | 用户输入 | Agent可选择采纳/忽略 |
| 中断 | 强制停止 | 暂停模拟，等待人类输入 |

---

## 5. 辅助功能

### 5.1 回忆功能

- **形式**: 时间线展示
- **内容**: Agent历史行为记录、决策过程、关键节点
- **用途**: 用户回溯、行为分析、信任建立

#### 5.1.1 事件溯源表设计

```sql
-- 核心事件表
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_id UUID NOT NULL,           -- 聚合根ID (user_id / agent_id / round_id)
  aggregate_type TEXT NOT NULL,         -- 聚合类型: user, agent, round, match, debate, cotrial
  event_type TEXT NOT NULL,             -- 事件类型: action.performed, decision.made, etc.
  event_version INTEGER DEFAULT 1,      -- 事件版本
  payload JSONB NOT NULL,               -- 事件载荷
  metadata JSONB DEFAULT '{}',          -- 元数据 (trace_id, session_id)
  caused_by_event_id UUID REFERENCES events(id), -- 因果链
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX idx_events_caused_by ON events(caused_by_event_id);
```

#### 5.1.2 Agent决策追踪

```typescript
interface AgentTrace {
  id: string;
  agentId: string;
  sessionId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';

  // 决策树
  spans: TraceSpan[];

  // 关键决策点
  decisions: AgentDecision[];

  // 工具调用
  toolCalls: ToolCall[];
}

interface TraceSpan {
  id: string;
  parentSpanId?: string;
  name: string;                    // 'analyze_round', 'generate_match'
  type: 'thinking' | 'action' | 'observation';
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;               // ms
  tokens?: { prompt: number; completion: number; total: number };
}

interface AgentDecision {
  id: string;
  decisionType: 'select_action' | 'generate_response' | 'evaluate_match' | 'assess_risk';
  context: {
    availableActions: string[];
    reasoning: string;             // LLM的推理过程
    chosenAction: string;
    confidence?: number;
  };
  createdAt: Date;
}
```

#### 5.1.3 时间线查询API

```typescript
interface TimelineQuery {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  limit?: number;
  offset?: number;
  includeAgentTraces?: boolean;
}

async function queryUserTimeline(query: TimelineQuery) {
  let baseQuery = supabase
    .from('events')
    .select('*')
    .eq('aggregate_id', query.userId)
    .order('created_at', { ascending: false });

  if (query.startDate) baseQuery = baseQuery.gte('created_at', query.startDate.toISOString());
  if (query.endDate) baseQuery = baseQuery.lte('created_at', query.endDate.toISOString());
  if (query.eventTypes?.length) baseQuery = baseQuery.in('event_type', query.eventTypes);

  return await baseQuery.range(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 20));
}
```

#### 5.1.4 UI组件选型

| 场景 | 推荐组件 |
|------|----------|
| 活动热力图 | `react-github-calendar` |
| 垂直时间线 | `@gravity-ui/timeline` |
| Agent决策轨迹 | 自定义TraceTree组件 |

#### 5.1.5 与AI服务集成

在MiniMax客户端调用时自动记录trace：

```typescript
class MiniMaxClient {
  async chat(options: MiniMaxCallOptions) {
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    // 1. 记录开始事件
    await auditLogger.appendEvent(this.agentId, 'agent', 'agent.span.started',
      { traceId, spanId, model: options.model });

    // 2. 执行调用
    const result = await this.executeChat(options);

    // 3. 记录完成事件
    await auditLogger.appendEvent(this.agentId, 'agent', 'agent.span.completed',
      { traceId, spanId, output: result, latency: result.latency });

    return result;
  }
}
```

### 5.2 信誉系统

- **能力标签**: 专业领域、协作风格、信誉评分
- **评估维度**: 完成度、响应质量、协作表现

### 5.3 安全控制

- **权限分级**: 公开/仅好友/私密
- **内容审核**: 敏感词过滤、违规检测
- **数据隔离**: 用户数据加密存储

### 5.4 社区广场

- **信息流**: 推荐圆桌、知遇卡展示、成功案例
- **社交功能**: 关注、点赞、评论

### 5.5 成长体系

- **积分**: 参与圆桌、完成匹配、获得好评
- **成就**: 匹配达人、讨论专家、伯乐奖章

---

## 6. UI 设计参考

### 6.1 入口层

- **模式切换**: Toggle开关 + 状态指示
- **Agent发现**: Tinder式网格 + Agent卡片 (Character.AI Persona格式)
- **设计参考**: 简洁的开关面板 + 卡片式列表

### 6.2 伯乐层

- **圆桌界面**: Discord频道布局 + Visual Novel对话风格
- **设计参考**:
  - 左侧: 参与者列表 + 发言状态
  - 中间: 对话流 (气泡式 + 角色头像)
  - 右侧: 实时分析面板

### 6.3 共试层

- **模拟界面**: RTS游戏HUD + 实时指标仪表盘
- **设计参考**:
  - 顶部: 模拟进度条 + 时间显示
  - 核心区: Agent行为动画 + 对话气泡
  - 侧边栏: 实时指标变化 (信任度/冲突值等)
  - 底部: 干预按钮 (旁观/提示/中断)

### 6.4 辅助功能

- **安全设置**: Toggle List 面板 (简洁开关列表)
- **回忆功能**: 时间线组件 + 关键节点高亮
- **信誉展示**: 徽章系统 + 能力雷达图

---

## 7. 核心行为场景 (Gherkin)

```gherkin
# 入口层 - Agent模式开关
Feature: Agent模式开关控制
  As a 用户
  I want 切换Agent模式
  So that 决定是否让我的Agent自动行动

  Scenario: 开启Agent模式
    Given 用户已登录
    When 用户开启Agent模式
    And 设置autoAction为true
    Then Agent应自动参与圆桌讨论

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

---

## 8. 审计追踪设计

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

> 详细规范见 [`tests/README.md`](tests/README.md)

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

---

## 10. 配置更新

### 10.1 依赖更新

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "@anthropic-ai/a2a-protocol": "^0.1.0",
    "@modelcontextprotocol/sdk": "^0.5.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "playwright": "^1.40.0"
  }
}
```

---

## 11. 下一步行动 (黑客松)

### Phase 1: 核心功能 (MVP)

1. **SecondMe OAuth 集成**
   - 完成登录流程
   - Agent模式开关

2. **伯乐层 MVP**
   - 圆桌创建与参与
   - 知遇卡生成

3. **数据层**
   - Supabase 迁移
   - RLS 策略

### Phase 2: 扩展功能

4. **争鸣层 MVP**
   - 圆桌讨论界面
   - 关系验证

5. **共试层 MVP**
   - 剧情模拟框架
   - 干预机制

### Phase 3: 完善

6. **辅助功能**
   - 回忆功能
   - 信誉系统
   - 社区广场

7. **UI/UX 优化**
   - 各层界面完善
   - 响应式适配

---

## 12. 推荐技术栈

| 功能 | 推荐方案 |
|------|----------|
| 多Agent框架 | **AutoGen** + 自定义State Machine |
| 实时通信 | **Supabase Realtime** |
| LLM | **MiniMax** (成本低，长上下文) |
| 匹配引擎 | 自定义 + **Gorse** (可选) |
| 状态管理 | **XState** (复杂流程编排) |
| 记忆存储 | Supabase + 向量DB (RAG) |
| UI风格 | Discord/Visual Novel混合 |

### 12.1 推荐开源项目

| 类别 | 项目 | 特点 |
|------|------|------|
| 多Agent | **AutoGen** (Microsoft) | GroupChat + 自定义speaker selection |
| 多Agent | **Swarms** | RoundTableDiscussion、ExpertPanelDiscussion |
| 多Agent | **CAMEL** | 角色扮演Agent框架 |
| 推荐系统 | **Gorse** | Go实现，高性能，支持LLM ranker |
| 游戏AI | **PettingZoo** | 多Agent强化学习环境 |
| 模拟 | **Cogment** | Human-in-the-loop ML |
| 模拟 | **AI Town** | 虚拟小镇 + 25个生成式Agent |
| AI可观测性 | **Langfuse** | Trace/评估/Prompt管理 |

### 12.2 开发优先级建议

#### Phase 1: 基础搭建 (2周)
1. 引入AutoGen框架
2. 定义Persona Schema + Prompt模板
3. 实现Supabase Realtime消息流

#### Phase 2: 核心功能 (3周)
4. 互补性评分算法实现
5. 争鸣层对练流程
6. 知遇卡生成逻辑

#### Phase 3: 模拟增强 (2周)
7. 共试层状态机
8. 干预机制开发
9. 实时指标面板

#### Phase 4: 辅助功能 (2周)
10. 回忆时间线
11. 信誉系统
12. 社区广场
