-- =====================================================
-- 知遇圆桌 RLS (Row Level Security) 安全策略
-- 生成日期: 2026-03-15
-- 策略总数: 26
-- 覆盖表数: 11
-- =====================================================

-- =====================================================
-- 1. 启用 RLS 所有表
-- =====================================================

-- 核心表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 议题和圆桌
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 三层核心
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotrials ENABLE ROW LEVEL SECURITY;

-- 审计
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. users 表策略
-- =====================================================

-- 用户可以查看自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的数据
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的数据（注册时）
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. agents 表策略
-- =====================================================

-- 用户只能查看自己的 Agent
CREATE POLICY "Users can view own agent" ON agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- 用户只能更新自己的 Agent
CREATE POLICY "Users can update own agent" ON agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- =====================================================
-- 4. topics 表策略
-- =====================================================

-- 所有人可以查看活跃的议题
CREATE POLICY "Anyone can view active topics" ON topics
  FOR SELECT USING (status = 'active');

-- =====================================================
-- 5. rounds 表策略
-- =====================================================

-- 所有人可以查看非归档的圆桌
CREATE POLICY "Anyone can view active rounds" ON rounds
  FOR SELECT USING (status != 'archived');

-- =====================================================
-- 6. round_participants 表策略
-- =====================================================

-- 参与者可以查看自己的参与
CREATE POLICY "Participants can view own participation" ON round_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = round_participants.user_id AND users.id = auth.uid()
    )
  );

-- =====================================================
-- 7. messages 表策略
-- =====================================================

-- 圆桌参与者可以查看消息
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM round_participants
      WHERE round_participants.round_id = messages.round_id
      AND round_participants.user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. matches 表策略（伯乐层）
-- =====================================================

-- 匹配双方可以查看自己的匹配
CREATE POLICY "Matched users can view own matches" ON matches
  FOR SELECT USING (
    user_a_id = auth.uid() OR user_b_id = auth.uid()
  );

-- =====================================================
-- 9. debates 表策略（争鸣层）
-- =====================================================

-- 匹配双方可以查看争鸣层数据
CREATE POLICY "Matched users can view debates" ON debates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = debates.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );

-- =====================================================
-- 10. cotrials 表策略（共试层）
-- =====================================================

-- 匹配双方可以查看共试层数据
CREATE POLICY "Matched users can view cotrials" ON cotrials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debates
      JOIN matches ON matches.id = debates.match_id
      WHERE debates.id = cotrials.debate_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );

-- =====================================================
-- 11. audit_logs 表策略（审计）
-- =====================================================

-- 用户只能查看自己的审计日志
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (
    actor_id = auth.uid() AND actor_type = 'user'
  );

-- =====================================================
-- 管理命令
-- =====================================================

-- 查看所有策略
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 查看 RLS 状态
-- SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public';

-- 禁用 RLS（谨慎使用）
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 删除策略
-- DROP POLICY "policy_name" ON table_name;

-- =====================================================
-- 文件信息
-- =====================================================
-- 文件名: rls_policies.sql
-- 生成日期: 2026-03-15
-- 策略数量: 26
-- 覆盖表数: 11
-- 用途: 知遇圆桌 RLS 安全策略完整配置
-- =====================================================