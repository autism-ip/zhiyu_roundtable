# 知遇圆桌 - 项目架构文档

**版本**: v0.1.0-alpha
**更新日期**: 2026-03-15
**状态**: 核心开发完成

---

## 目录

1. [架构概览](#架构概览)
2. [技术栈](#技术栈)
3. [目录结构](#目录结构)
4. [数据流](#数据流)
5. [核心模块](#核心模块)
6. [API设计](#api设计)
7. [安全策略](#安全策略)
8. [部署架构](#部署架构)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         知遇圆桌架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   伯乐层     │───▶│   争鸣层     │───▶│   共试层     │         │
│   │  (发现)     │    │  (验证)      │    │  (落地)      │         │
│   └─────────────┘    └─────────────┘    └─────────────┘         │
│          │                    │                    │              │
│          ▼                    ▼                    ▼              │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              数据层 (Supabase)                        │       │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │       │
│   │   │  users  │ │ rounds  │ │ matches │ │ debates │   │       │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘   │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.0 | 全栈框架 |
| React | 18.2.0 | UI 库 |
| TypeScript | 5.3.0 | 类型系统 |
| Tailwind CSS | 3.4.0 | 样式框架 |
| shadcn/ui | latest | 组件库 |
| Framer Motion | 11.0.0 | 动画库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API | 14.2.0 | API 路由 |
| NextAuth.js | 5.0.0-beta.15 | 认证 |
| Supabase | latest | 数据库/认证 |
| PostgreSQL | 17 | 关系数据库 |

### 开发工具
| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| TypeScript | 类型检查 |
| Vitest | 单元测试 |
| Playwright | E2E 测试 |

---

## 目录结构

```
zhiyu_roundtable/
│
├── 📁 app/                          # Next.js App Router
│   ├── 📁 api/                      # API 路由
│   │   ├── 📁 auth/[...nextauth]/   # 认证路由
│   │   ├── 📁 rounds/               # 圆桌 API
│   │   ├── 📁 cards/                # 知遇卡 API
│   │   ├── 📁 messages/              # 消息 API
│   │   ├── 📁 topics/                # 议题 API
│   │   └── 📁 matches/               # 匹配 API
│   │
│   ├── 📁 (main)/                   # 主布局
│   │   ├── 📁 rounds/                # 圆桌页面
│   │   ├── 📁 cards/                 # 知遇卡页面
│   │   └── 📁 profile/               # 用户中心
│   │
│   ├── 📁 login/                     # 登录页
│   ├── 📄 layout.tsx                 # 根布局
│   └── 📄 page.tsx                   # 首页
│
├── 📁 lib/                          # 核心库
│   ├── 📁 bole/                      # 伯乐层
│   │   ├── 📄 card-generator.ts      # 知遇卡生成器
│   │   └── 📁 __tests__/             # 测试
│   │
│   ├── 📁 zhengming/                 # 争鸣层
│   │   ├── 📄 debate-engine.ts       # 争鸣引擎
│   │   └── 📁 __tests__/             # 测试
│   │
│   ├── 📁 gongshi/                   # 共试层
│   │   ├── 📄 task-assigner.ts       # 任务分配器
│   │   └── 📁 __tests__/             # 测试
│   │
│   ├── 📁 supabase/                  # 数据库
│   │   ├── 📄 client.ts              # 客户端
│   │   └── 📄 types.ts               # 类型定义
│   │
│   ├── 📄 auth.ts                    # 认证配置
│   └── 📄 utils.ts                   # 工具函数
│
├── 📁 components/                    # 组件
│   ├── 📁 ui/                        # UI 组件
│   └── 📄 providers.tsx             # Provider
│
├── 📁 types/                         # 类型定义
│   └── 📄 index.ts                   # 全局类型
│
├── 📁 scripts/                       # 工具脚本
│   └── 📄 generate-demo-data.ts     # 演示数据生成
│
├── 📁 docs/                          # 项目文档
│   ├── 📄 RLS_POLICIES.md            # RLS策略
│   ├── 📄 DATABASE_MIGRATION_SUMMARY.md
│   └── 📄 API_STATUS.md
│
├── 📁 supabase/                      # Supabase配置
│   └── 📄 rls_policies.sql           # RLS SQL
│
├── 📄 .env.local                     # 环境变量
├── 📄 next.config.js                 # Next.js配置
├── 📄 tailwind.config.ts             # Tailwind配置
├── 📄 tsconfig.json                 # TypeScript配置
├── 📄 package.json                   # 依赖
└── 📄 README.md                      # 项目说明
```

---

## 数据流

### 1. 伯乐层 - 知遇卡生成流程

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  圆桌讨论  │────▶│  Agent   │────▶│ 知遇卡生成器  │────▶│ 知遇卡   │
│          │     │  表现分析 │     │ (伯乐层)     │     │         │
└──────────┘     └──────────┘     └──────────────┘     └──────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │ 互补性分析   │
                                    │ - 技能互补   │
                                    │ - 视角多样   │
                                    │ - 沟通兼容   │
                                    │ - 价值契合   │
                                    └──────────────┘
```

### 2. 争鸣层 - 结构化对练流程

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  知遇卡  │────▶│  争鸣引擎    │────▶│  压力测试   │
│  (匹配)  │     │ (争鸣层)     │     │            │
└──────────┘     └──────────────┘     └──────────────┘
                                              │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  风险领域    │          │  压力点      │          │  高风险问题  │
            │  分析       │          │  识别        │          │  生成        │
            └──────────────┘          └──────────────┘          └──────────────┘
```

### 3. 共试层 - 任务协作流程

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  争鸣层  │────▶│  共试层      │────▶│  任务分配    │────▶│  协作    │
│  (验证)  │     │  任务分配器  │     │  - 任务设计  │     │  执行    │
└──────────┘     └──────────────┘     │  - 目标设定  │     └──────────┘
                                      │  - 时间规划  │          │
                                      └──────────────┘          ▼
                                                         ┌──────────┐
                                                         │  结果    │
                                                         │  评估    │
                                                         └──────────┘
```

---

## 核心模块

### 1. 伯乐层 (lib/bole/)

**职责**: 发现高价值连接，生成知遇卡

**核心类**:
- `CardGenerator` - 知遇卡生成器
- `ComplementarityAnalyzer` - 互补性分析器
- `FutureGenerativityAssessor` - 未来生成性评估器

**算法**:
- 互补性分析 (6维度)
- 未来生成性评估 (5维度)
- 关系类型判断 (5种类型)

### 2. 争鸣层 (lib/zhengming/)

**职责**: 验证合作可行性，结构化对练

**核心类**:
- `DebateEngine` - 争鸣引擎
- `RiskAnalyzer` - 风险分析器
- `QuestionGenerator` - 问题生成器
- `ResponseAnalyzer` - 响应分析器

**算法**:
- 风险领域分析
- 压力点识别
- 高风险问题生成
- 响应质量评估

### 3. 共试层 (lib/gongshi/)

**职责**: 低成本验证，任务协作

**核心类**:
- `TaskAssigner` - 任务分配器
- `TaskEvaluator` - 任务评估器
- `CollaborationTracker` - 协作追踪器

**算法**:
- 任务类型匹配
- 复杂度计算
- 风险评估
- 时间估算

---

## API设计

### REST API 规范

#### 认证相关
```
POST   /api/auth/signin          # 登录
POST   /api/auth/signout         # 登出
GET    /api/auth/session         # 获取会话
GET    /api/auth/providers       # 获取提供者列表
```

#### 业务API
```
# 圆桌管理
GET    /api/rounds               # 获取圆桌列表
POST   /api/rounds               # 创建圆桌
GET    /api/rounds/:id           # 获取圆桌详情
PATCH  /api/rounds/:id           # 更新圆桌

# 知遇卡管理
GET    /api/cards                # 获取知遇卡列表
GET    /api/cards/:id            # 获取知遇卡详情
PATCH  /api/cards/:id            # 接受/拒绝知遇卡

# 消息系统
GET    /api/messages             # 获取消息列表
POST   /api/messages             # 发送消息
GET    /api/messages/unread      # 获取未读消息数

# 议题管理
GET    /api/topics               # 获取议题列表
GET    /api/topics/:id           # 获取议题详情

# 匹配管理
GET    /api/matches              # 获取匹配列表
GET    /api/matches/:id          # 获取匹配详情
PATCH  /api/matches/:id          # 更新匹配状态

# 争鸣层
GET    /api/debates              # 获取争鸣记录
POST   /api/debates              # 创建争鸣
GET    /api/debates/:id          # 获取争鸣详情
POST   /api/debates/:id/respond  # 提交响应

# 共试层
GET    /api/cotrials             # 获取共试任务
POST   /api/cotrials             # 创建共试任务
GET    /api/cotrials/:id          # 获取共试详情
POST   /api/cotrials/:id/complete  # 完成任务
```

### API响应格式

#### 成功响应
```json
{
  "data": {
    // 响应数据
  },
  "meta": {
    "pagination": {
      "total": 100,
      "offset": 0,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

#### 错误响应
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未授权访问",
    "details": {}
  }
}
```

---

## 安全策略

### 1. 认证安全
- ✅ JWT 认证 (NextAuth.js v5)
- ✅ OAuth 2.0 (SecondMe)
- ✅ 会话管理
- ✅ CSRF 保护

### 2. 数据安全
- ✅ Row Level Security (RLS)
- ✅ 字段级权限控制
- ✅ 数据加密传输 (HTTPS)
- ✅ SQL 注入防护

### 3. API安全
- ✅ 速率限制
- ✅ 请求验证
- ✅ CORS 配置
- ✅ 错误处理

---

## 部署架构

### 开发环境
```
本地开发 (localhost:3000)
  ├── Next.js Dev Server
  ├── Supabase Local (可选)
  └── Hot Reload
```

### 生产环境
```
Vercel Edge (全球CDN)
  ├── Next.js App
  ├── Serverless Functions
  └── Edge Middleware

Supabase Cloud
  ├── PostgreSQL
  ├── Auth
  └── Realtime
```

---

## 开发规范

### 代码风格
- TypeScript 严格模式
- ESLint + Prettier
- 函数式编程优先
- 模块化设计

### Git 规范
- Conventional Commits
- Feature Branch 工作流
- PR 代码审查
- 自动化测试

### 文档规范
- JSDoc 注释
- README 维护
- 架构决策记录 (ADR)
- API 文档

---

## 监控与运维

### 日志监控
- 应用日志
- 错误追踪
- 性能监控
- 用户行为分析

### 告警机制
- 错误率告警
- 性能告警
- 可用性监控
- 安全告警

---

## 性能指标

### 目标指标
| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 首屏加载 | < 2s | ⏳ 待测 |
| API响应 | < 200ms | ⏳ 待测 |
| 数据库查询 | < 50ms | ⏳ 待测 |
| 并发用户 | 1000+ | ⏳ 待测 |

---

## 项目状态

```
📊 项目完成度: 约 60%

✅ 已完成:
  - 基础设施搭建
  - 数据库层实现
  - 安全策略部署
  - API层开发
  - 核心算法实现

⏳ 进行中:
  - OAuth集成
  - 前端开发
  - 测试覆盖

⏳ 待开始:
  - 性能优化
  - 部署上线
  - 运维监控
```

---

## 联系方式

- **项目地址**: GitHub (待创建)
- **文档地址**: Vercel (待部署)
- **技术支持**: 知遇圆桌团队

---

**知遇圆桌 - 发现本不该错过的人** 🎯
