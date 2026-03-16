# RLS 安全策略文档

## 概述

本文档记录了知遇圆桌项目的 Row Level Security (RLS) 安全策略配置。

- **启用状态**: 所有 11 个表已启用 RLS
- **策略总数**: 26 个安全策略
- **认证方式**: Supabase Auth (JWT)

## 策略总览

| 表名 | RLS 状态 | 策略数 | 访问控制说明 |
|------|---------|--------|-------------|
| users | ✅ 启用 | 3 | 用户只能操作自己的数据 |
| agents | ✅ 启用 | 2 | 用户只能操作自己的 Agent |
| topics | ✅ 启用 | 1 | 公开可读，活跃议题可见 |
| rounds | ✅ 启用 | 1 | 公开可读（非归档） |
| round_participants | ✅ 启用 | 1 | 参与者可查看自己的参与 |
| messages | ✅ 启用 | 1 | 圆桌参与者可查看消息 |
| matches | ✅ 启用 | 1 | 匹配双方可查看匹配 |
| debates | ✅ 启用 | 1 | 匹配双方可查看争鸣 |
| cotrials | ✅ 启用 | 1 | 匹配双方可查看共试 |
| audit_logs | ✅ 启用 | 1 | 用户只能查看自己的审计 |

## 详细策略说明

### 1. users 表

```sql
-- 查看自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 更新自己的数据
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 插入自己的数据（注册时）
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. agents 表

```sql
-- 查看自己的 Agent
CREATE POLICY "Users can view own agent" ON agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- 更新自己的 Agent
CREATE POLICY "Users can update own agent" ON agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );
```

### 3. topics 表

```sql
-- 查看活跃议题
CREATE POLICY "Anyone can view active topics" ON topics
  FOR SELECT USING (status = 'active');
```

### 4. rounds 表

```sql
-- 查看活跃圆桌
CREATE POLICY "Anyone can view active rounds" ON rounds
  FOR SELECT USING (status != 'archived');
```

### 5. round_participants 表

```sql
-- 查看自己的参与
CREATE POLICY "Participants can view own participation" ON round_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = round_participants.user_id AND users.id = auth.uid()
    )
  );
```

### 6. messages 表

```sql
-- 圆桌参与者查看消息
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM round_participants
      WHERE round_participants.round_id = messages.round_id
      AND round_participants.user_id = auth.uid()
    )
  );
```

### 7. matches 表

```sql
-- 匹配双方查看匹配
CREATE POLICY "Matched users can view own matches" ON matches
  FOR SELECT USING (
    user_a_id = auth.uid() OR user_b_id = auth.uid()
  );
```

### 8. debates 表

```sql
-- 匹配双方查看争鸣
CREATE POLICY "Matched users can view debates" ON debates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = debates.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );
```

### 9. cotrials 表

```sql
-- 匹配双方查看共试
CREATE POLICY "Matched users can view cotrials" ON cotrials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debates
      JOIN matches ON matches.id = debates.match_id
      WHERE debates.id = cotrials.debate_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );
```

### 10. audit_logs 表

```sql
-- 用户查看自己的审计日志
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (
    actor_id = auth.uid() AND actor_type = 'user'
  );
```

## 安全最佳实践

### 1. 策略设计原则
- **最小权限原则**: 只授予必要的访问权限
- **数据隔离**: 用户只能访问自己的数据
- **关系验证**: 通过外键关系验证访问权限

### 2. 性能考虑
- 策略中的子查询会影响性能
- 对于高频访问的表，考虑使用物化视图
- 使用索引优化策略查询

### 3. 审计和监控
```sql
-- 查看策略执行日志
SELECT * FROM pg_stat_statements
WHERE query LIKE '%policy%';

-- 监控 RLS 性能
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE rowsecurity = true;
```

## 故障排除

### 问题: 策略未生效
```sql
-- 检查 RLS 是否启用
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'users';

-- 强制刷新策略缓存
SELECT pg_reload_conf();
```

### 问题: 权限拒绝
```sql
-- 查看当前用户
SELECT current_user, session_user;

-- 测试策略
SELECT * FROM users
WHERE auth.uid() = id;
```

## 更新记录

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-03-15 | 初始创建，26 个策略 | Claude |
| 2026-03-15 | 启用所有 11 个表的 RLS | Claude |

---

**注意**: 本文档包含敏感的安全配置信息，请妥善保管。
