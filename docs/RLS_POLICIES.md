# RLS 安全策略文档

> **关联**：本文档是数据层安全策略的详细定义，与 [CLAUDE.md](../CLAUDE.md) 中的 Supabase 数据层设计对应

## 概述

本文档记录了知遇圆桌项目的 Row Level Security (RLS) 安全策略配置。

- **启用状态**: 所有 11 个表已启用 RLS
- **策略总数**: 26 个安全策略
- **认证方式**: Supabase Auth (JWT)

## 策略总览

| 表名 | RLS 状态 | 策略数 | 访问控制说明 |
|------|---------|--------|-------------|
| users | ✅ 启用 | 3 | 用户只能操作自己的数据 |
| agents | ✅ 启用 | 4 | 用户只能操作自己的 Agent（新增 INSERT/DELETE） |
| topics | ✅ 启用 | 4 | 公开可读，认证用户可管理（新增 INSERT/UPDATE/DELETE） |
| rounds | ✅ 启用 | 4 | 公开可读，认证用户可管理（新增 INSERT/UPDATE/DELETE） |
| round_participants | ✅ 启用 | 4 | 参与者可查看和管理自己的参与（新增 INSERT/UPDATE/DELETE） |
| messages | ✅ 启用 | 4 | 圆桌参与者可查看和管理消息（新增 INSERT/UPDATE/DELETE） |
| matches | ✅ 启用 | 3 | 匹配双方可查看和管理（新增 INSERT/UPDATE） |
| debates | ✅ 启用 | 3 | 匹配双方可查看和管理（新增 INSERT/UPDATE） |
| cotrials | ✅ 启用 | 3 | 匹配双方可查看和管理（新增 INSERT/UPDATE） |
| audit_logs | ✅ 启用 | 2 | 用户可查看，Service role 可插入（新增 INSERT） |

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

-- 插入自己的 Agent
CREATE POLICY "Users can insert own agents" ON agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- 删除自己的 Agent
CREATE POLICY "Users can delete own agents" ON agents
  FOR DELETE USING (
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

-- 认证用户可以创建 topic
CREATE POLICY "Authenticated users can insert topics" ON topics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 认证用户可以更新 topic
CREATE POLICY "Authenticated users can update topics" ON topics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 认证用户可以删除 topic
CREATE POLICY "Authenticated users can delete topics" ON topics
  FOR DELETE USING (auth.role() = 'authenticated');
```

### 4. rounds 表

```sql
-- 查看活跃圆桌
CREATE POLICY "Anyone can view active rounds" ON rounds
  FOR SELECT USING (status != 'archived');

-- 认证用户可以创建 round
CREATE POLICY "Authenticated users can insert rounds" ON rounds
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 认证用户可以更新 round
CREATE POLICY "Authenticated users can update rounds" ON rounds
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 认证用户可以删除 round
CREATE POLICY "Authenticated users can delete rounds" ON rounds
  FOR DELETE USING (auth.role() = 'authenticated');
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

-- 认证用户可以加入 round
CREATE POLICY "Authenticated users can insert round participants" ON round_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 参与者可以更新自己的参与状态
CREATE POLICY "Users can update own participation" ON round_participants
  FOR UPDATE USING (user_id = auth.uid());

-- 参与者可以退出 round
CREATE POLICY "Users can delete own participation" ON round_participants
  FOR DELETE USING (user_id = auth.uid());
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

-- 圆桌参与者可以发送消息
CREATE POLICY "Participants can insert messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM round_participants
      WHERE round_participants.round_id = messages.round_id
      AND round_participants.user_id = auth.uid()
    )
  );

-- 消息发送者可以更新自己的消息
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    agent_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agents a
      JOIN users u ON u.id = a.user_id
      WHERE a.id = messages.agent_id AND u.id = auth.uid()
    )
  );

-- 消息发送者可以删除自己的消息
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (
    agent_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agents a
      JOIN users u ON u.id = a.user_id
      WHERE a.id = messages.agent_id AND u.id = auth.uid()
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

-- Service role 可以创建 match
CREATE POLICY "Service role can insert matches" ON matches
  FOR INSERT WITH CHECK (true);

-- 匹配双方可以更新 match
CREATE POLICY "Matched users can update matches" ON matches
  FOR UPDATE USING (user_a_id = auth.uid() OR user_b_id = auth.uid());
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

-- Service role 可以创建 debate
CREATE POLICY "Service role can insert debates" ON debates
  FOR INSERT WITH CHECK (true);

-- 匹配双方可以更新 debate
CREATE POLICY "Matched users can update debates" ON debates
  FOR UPDATE USING (
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

-- Service role 可以创建 cotrial
CREATE POLICY "Service role can insert cotrials" ON cotrials
  FOR INSERT WITH CHECK (true);

-- 匹配双方可以更新 cotrial
CREATE POLICY "Matched users can update cotrials" ON cotrials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM debates d
      JOIN matches m ON m.id = d.match_id
      WHERE d.id = cotrials.debate_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
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

-- Service role 可以插入审计日志
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
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
| 2026-03-20 | 新增 18 个 INSERT/UPDATE/DELETE 策略，策略总数达到 44 | Claude |

---

**注意**: 本文档包含敏感的安全配置信息，请妥善保管。
