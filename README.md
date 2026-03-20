# 知遇圆桌

> A2A 时代的高价值连接发现与验证系统
>
> 伯乐层 × 争鸣层 × 共试层

[![SecondMe](https://img.shields.io/badge/Powered%20by-SecondMe-blue)](https://second.me)
[![知乎](https://img.shields.io/badge/知乎-特别奖-0084ff)](https://zhihu.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)

---

## 一句话定义

**知遇圆桌** 是一个面向 A2A 时代的高价值连接发现与验证系统。

它的核心不是"匹配过去"，而是**发现未来可能生成的新关系**；也不是"制造更多连接"，而是**制造更少但更重要的连接**。

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                      知遇圆桌                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   伯乐层    │ →  │   争鸣层    │ →  │   共试层    │ │
│  │  发现连接   │    │  验证关系   │    │  落地行动   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
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
| 数据库 | Supabase (PostgreSQL) | 关系型 + Realtime |
| 认证 | NextAuth + SecondMe OAuth | A2A 生态认证 |
| AI/LLM | MiniMax | Agent 编排 |
| 部署 | Vercel | 边缘网络部署 |

---

## 快速开始

### 前置要求

- Node.js 18+
- Supabase 项目
- SecondMe OAuth 凭证

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-org/zhiyu-roundtable.git
cd zhiyu-roundtable

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入必要的配置

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用。

---

## 核心概念

### 伯乐层

发现"本不该错过的人"。不按相似性推荐，而按能力互补、轨迹迁移性、未来生成性。

### 争鸣层

验证"就算相遇了，你们能不能真的一起做成事"。通过结构化问题对练，判断分歧类型和关系类型。

### 共试层

把推荐与判断落到低成本现实行动中。通过最小化试错让关系低成本落地。

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | **项目宪法** - 完整架构、A2A协议、开发规范 |
| [tests/README.md](./tests/README.md) | TDD 实现规范 |
| [docs/RLS_POLICIES.md](./docs/RLS_POLICIES.md) | RLS 安全策略 |
| [docs/DATABASE_MIGRATION_SUMMARY.md](./docs/DATABASE_MIGRATION_SUMMARY.md) | 数据库迁移报告 |
| [docs/RLS_QUICK_REFERENCE.md](./docs/RLS_QUICK_REFERENCE.md) | RLS 快速参考 |

---

## 贡献指南

请参阅 [CLAUDE.md](./CLAUDE.md) 了解开发规范和架构决策。

---

## 许可证

MIT

---

<p align="center">
  Made with ❤️ by 知遇圆桌团队
</p>
