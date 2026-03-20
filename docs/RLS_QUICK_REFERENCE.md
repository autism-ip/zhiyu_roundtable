# RLS 快速参考指南

> **关联**：本文档是 RLS 策略的快速参考，详细定义请参阅 [RLS_POLICIES.md](./RLS_POLICIES.md)，与 [CLAUDE.md](../CLAUDE.md) 中的 Supabase 数据层设计对应

## 状态总览

```
┌─────────────────────────────────────────────────────────────┐
│  RLS 状态: ✅ 已启用                                        │
│  表数量: 11                                                 │
│  策略总数: 44                                               │
│  最后更新: 2026-03-20                                      │
└─────────────────────────────────────────────────────────────┘
```

## 表状态速查

| 表名 | RLS | 策略数 | 访问级别 |
|------|-----|--------|----------|
| audit_logs | ✅ | 2 | 用户只读 + Service INSERT |
| agents | ✅ | 4 | 用户私有 + INSERT/DELETE |
| cotrials | ✅ | 3 | 匹配双方读写 + Service INSERT |
| debates | ✅ | 3 | 匹配双方读写 + Service INSERT |
| matches | ✅ | 3 | 匹配双方读写 + Service INSERT |
| messages | ✅ | 4 | 参与者读写 |
| round_participants | ✅ | 4 | 参与者读写 |
| rounds | ✅ | 4 | 认证用户管理 |
| topics | ✅ | 4 | 认证用户管理 |
| users | ✅ | 3 | 用户私有 |

## 常用查询

### 1. 检查 RLS 状态

```sql
-- 查看所有表的 RLS 状态
SELECT
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname) as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public'
ORDER BY tablename;
```

### 2. 查看策略详情

```sql
-- 列出所有策略
SELECT
    tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. 测试 RLS

```sql
-- 设置当前用户（模拟）
SET LOCAL auth.uid = 'user-uuid-here';

-- 测试查询
SELECT * FROM users;
SELECT * FROM agents;
SELECT * FROM matches;

-- 恢复
RESET auth.uid;
```

## 策略规则速查

### users 表
```
SELECT: auth.uid() = id
INSERT: auth.uid() = id
UPDATE: auth.uid() = id
```

### agents 表
```
SELECT: agents.user_id = auth.uid()
INSERT: agents.user_id = auth.uid()
UPDATE: agents.user_id = auth.uid()
DELETE: agents.user_id = auth.uid()
```

### matches 表
```
SELECT: user_a_id = auth.uid() OR user_b_id = auth.uid()
INSERT: true (Service role)
UPDATE: user_a_id = auth.uid() OR user_b_id = auth.uid()
```

### topics/rounds 表
```
SELECT: status = 'active' (公开访问)
INSERT: auth.role() = 'authenticated'
UPDATE: auth.role() = 'authenticated'
DELETE: auth.role() = 'authenticated'
```

### round_participants 表
```
SELECT: user_id = auth.uid()
INSERT: auth.role() = 'authenticated'
UPDATE: user_id = auth.uid()
DELETE: user_id = auth.uid()
```

### messages 表
```
SELECT: round_participants.user_id = auth.uid()
INSERT: round_participants.user_id = auth.uid()
UPDATE: agent.owner = auth.uid()
DELETE: agent.owner = auth.uid()
```

## 故障排除

### 问题：查询返回空结果
```sql
-- 检查当前认证状态
SELECT auth.uid() as current_user, auth.role() as current_role;

-- 检查 RLS 是否启用
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';
```

### 问题：策略未生效
```sql
-- 强制刷新策略缓存
SELECT pg_reload_conf();

-- 检查策略定义
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### 问题：权限拒绝
```sql
-- 检查用户权限
SELECT * FROM information_schema.table_privileges
WHERE table_name = 'users';

-- 检查角色成员
SELECT * FROM pg_auth_members;
```

## 性能优化

### 1. 为策略查询添加索引
```sql
-- 用户查询优化
CREATE INDEX idx_users_id ON users(id);

-- 匹配查询优化
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);

-- 参与查询优化
CREATE INDEX idx_participants_user ON round_participants(user_id);
CREATE INDEX idx_participants_round ON round_participants(round_id);
```

### 2. 策略优化技巧
- 避免复杂的子查询
- 使用 EXISTS 而不是 IN
- 利用索引列进行过滤

## 更新日志

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-03-15 | 初始创建 | 26 个策略，覆盖 11 个表 |
| 2026-03-15 | 启用 RLS | 所有表 RLS 已启用 |
| 2026-03-20 | 新增 18 个策略 | 补全 INSERT/UPDATE/DELETE，策略总数 44 |

---

**提示**: 本文档为快速参考，完整策略定义请参阅 `RLS_POLICIES.md`
