# 知遇圆桌

> A2A 时代的高价值连接发现与验证系统
>
> 伯乐层 × 争鸣层 × 共试层

[![SecondMe](https://img.shields.io/badge/Powered%20by-SecondMe-blue)](https://second.me)
[![知乎](https://img.shields.io/badge/知乎-特别奖-0084ff)](https://zhihu.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)

---

## 项目简介

**知遇圆桌** 是一个面向 A2A（Agent-to-Agent）时代的高价值连接发现与验证系统。

### 核心问题

旧互联网更擅长把内容推给人，越来越不擅长把人带给人。

**知遇圆桌** 要解决的问题是：
1. 如何发现那些**本不该错过**的人？
2. 如何在真正投入关系前，提前暴露**关键分歧**？
3. 如何把推荐与判断落到**低成本现实行动**中？

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                      知遇圆桌                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   伯乐层    │ →  │   争鸣层    │ →  │   共试层    │ │
│  │  发现连接   │    │  验证关系   │    │  落地行动   │ │
│  │             │    │             │    │             │ │
│  │ • 互补分析  │    │ • 压力测试  │    │ • 共试任务  │ │
│  │ • 生成预测  │    │ • 分歧暴露  │    │ • 结果反馈  │ │
│  │ • 知遇卡   │    │ • 关系建议  │    │ • 后续跟进  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 产品 Slogan

> **先让分身争鸣，再把本不该错过的人带到你面前。**

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14 | App Router、Server Components |
| 开发语言 | TypeScript 5 | 类型安全 |
| 样式方案 | Tailwind CSS | 原子化 CSS |
| UI 组件 | shadcn/ui | 高质量组件库 |
| 状态管理 | Zustand + React Query | 客户端 + 服务端状态 |
| ORM | Prisma 6 | 类型安全的数据库访问 |
| 数据库 | PostgreSQL | 关系型数据库 |
| 认证 | NextAuth + SecondMe OAuth | A2A 生态认证 |
| AI/LLM | OpenAI GPT-4 | Agent 编排 |
| 部署 | Vercel | 边缘网络部署 |

---

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 数据库
- SecondMe 开发者账号
- OpenAI API Key

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/your-org/zhiyu-roundtable.git
cd zhiyu-roundtable
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.example .env.local
# 编辑 .env.local，填入必要的配置
```

4. **初始化数据库**

```bash
npx prisma db push
npx prisma generate
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

---

## 项目结构

```
zhiyu_roundtable/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # 认证路由组
│   │   ├── login/page.tsx       # 登录页
│   │   └── callback/route.ts    # OAuth 回调
│   ├── (main)/                  # 主应用路由组
│   │   ├── layout.tsx           # 主布局
│   │   ├── page.tsx             # 仪表盘
│   │   ├── topics/page.tsx      # 议题广场
│   │   ├── round/[id]/page.tsx  # 圆桌讨论室
│   │   ├── match/page.tsx       # 知遇卡
│   │   └── debate/[id]/page.tsx # 争鸣层
│   ├── api/                     # API Routes
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首页/Landing
│   └── globals.css              # 全局样式
├── components/                  # 组件目录
│   ├── ui/                      # shadcn/ui 组件
│   ├── auth/                    # 认证相关
│   ├── round/                   # 圆桌组件
│   ├── match/                   # 知遇卡组件
│   ├── debate/                  # 争鸣层组件
│   └── providers.tsx            # 全局 Providers
├── lib/                         # 工具库
│   ├── prisma.ts                # Prisma 客户端
│   ├── auth.ts                  # NextAuth 配置
│   ├── utils.ts                 # 工具函数
│   ├── secondme.ts              # SecondMe API
│   └── agent-orchestrator.ts    # Agent 编排
├── stores/                      # Zustand 状态管理
├── hooks/                       # 自定义 Hooks
├── types/                       # TypeScript 类型
├── prisma/
│   └── schema.prisma            # 数据库模型
├── public/                      # 静态资源
├── .env.example                 # 环境变量示例
├── next.config.js               # Next.js 配置
├── tailwind.config.ts           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
└── package.json
```

---

## 核心概念

### 伯乐层

伯乐层的核心任务是从圆桌讨论中发现高价值连接。

**关键指标**：
- **互补性评分 (Complementarity Score)**：衡量双方在技能、视角、经验、性格上的互补程度
- **未来生成性评分 (Future Generativity Score)**：衡量双方组合后可能产生的新价值

**输出**：
- 知遇卡 (Match Card)：包含匹配理由、互补领域、推荐关系类型

### 争鸣层

争鸣层的核心任务是通过结构化压力测试验证关系的可行性。

**测试维度**：
- 让步能力
- 边界意识
- 风险偏好
- 决策风格
- 分歧类型

**输出**：
- 分析报告：包含关系建议、风险领域、下一步行动

### 共试层

共试层的核心任务是通过最小化试错让关系低成本落地。

**任务类型**：
- 共写一篇知乎回答
- 共做一个小分析
- 共发起一场圆桌
- 共做一个轻量 demo
- 7天/14天协作挑战

**输出**：
- 共试结果
- 双方反馈
- 是否继续联系的建议

---

## 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交 Bug 报告
- 提交功能请求
- 提交代码修复或新功能
- 改进文档
- 分享使用经验

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细信息。

---

## 许可证

本项目采用 [MIT 许可证](./LICENSE)。

---

## 致谢

- [SecondMe](https://second.me) - 提供 A2A 基础设施和 OAuth 服务
- [知乎](https://zhihu.com) - 提供真实议题和数据支持
- [Next.js](https://nextjs.org) - 提供优秀的 React 框架
- [shadcn/ui](https://ui.shadcn.com) - 提供高质量的 UI 组件
- [OpenAI](https://openai.com) - 提供 GPT-4 API

---

## 联系我们

- 项目主页：https://zhiyu.dev
- 问题反馈：https://github.com/your-org/zhiyu-roundtable/issues
- 邮件联系：contact@zhiyu.dev

---

<p align="center">
  Made with ❤️ by 知遇圆桌团队
</p>
