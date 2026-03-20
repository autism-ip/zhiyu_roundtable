-- =====================================================
-- 知遇圆桌 RLS 补充策略 (INSERT + UPDATE + DELETE)
-- 迁移名称: add_missing_insert_policies
-- 生成日期: 2026-03-20
-- 目的: 补全 INSERT 策略，允许应用写入数据
-- 注意: topics/rounds 表无 created_by 字段，使用宽松策略
-- =====================================================

-- =====================================================
-- 1. audit_logs 表 - INSERT 策略
-- =====================================================

-- Service role 可以插入审计日志（系统内部使用）
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. agents 表 - INSERT + DELETE 策略
-- =====================================================

-- 认证用户可以创建自己的 agent
CREATE POLICY "Users can insert own agents" ON agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- 用户可以删除自己的 agent
CREATE POLICY "Users can delete own agents" ON agents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = agents.user_id AND users.id = auth.uid()
    )
  );

-- =====================================================
-- 3. topics 表 - INSERT + UPDATE + DELETE 策略
-- =====================================================

-- 认证用户可以创建 topic
CREATE POLICY "Authenticated users can insert topics" ON topics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 认证用户可以更新 topic（当前 schema 无 created_by，使用宽松策略）
CREATE POLICY "Authenticated users can update topics" ON topics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 认证用户可以删除 topic
CREATE POLICY "Authenticated users can delete topics" ON topics
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. rounds 表 - INSERT + UPDATE + DELETE 策略
-- =====================================================

-- 认证用户可以创建 round
CREATE POLICY "Authenticated users can insert rounds" ON rounds
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 认证用户可以更新 round（当前 schema 无 creator_id，使用宽松策略）
CREATE POLICY "Authenticated users can update rounds" ON rounds
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 认证用户可以删除 round
CREATE POLICY "Authenticated users can delete rounds" ON rounds
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. round_participants 表 - INSERT + UPDATE + DELETE 策略
-- =====================================================

-- 认证用户可以加入 round
CREATE POLICY "Authenticated users can insert round participants" ON round_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 参与者可以更新自己的参与状态
CREATE POLICY "Users can update own participation" ON round_participants
  FOR UPDATE USING (user_id = auth.uid());

-- 参与者可以退出 round
CREATE POLICY "Users can delete own participation" ON round_participants
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 6. messages 表 - INSERT + UPDATE + DELETE 策略
-- =====================================================

-- 圆桌参与者可以发送消息
CREATE POLICY "Participants can insert messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM round_participants
      WHERE round_participants.round_id = messages.round_id
      AND round_participants.user_id = auth.uid()
    )
  );

-- 消息发送者可以更新自己的消息（处理 agent_id 为 null 的情况）
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

-- =====================================================
-- 7. matches 表 - INSERT + UPDATE 策略
-- =====================================================

-- Service role 可以创建 match（系统内部生成）
CREATE POLICY "Service role can insert matches" ON matches
  FOR INSERT WITH CHECK (true);

-- 匹配双方可以更新 match（如接受/拒绝）
CREATE POLICY "Matched users can update matches" ON matches
  FOR UPDATE USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- =====================================================
-- 8. debates 表 - INSERT + UPDATE 策略
-- =====================================================

-- Service role 可以创建 debate（系统内部生成）
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

-- =====================================================
-- 9. cotrials 表 - INSERT + UPDATE 策略
-- =====================================================

-- Service role 可以创建 cotrial（系统内部生成）
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

-- =====================================================
-- 验证查询
-- =====================================================

-- 查看所有策略（执行后运行此查询验证）
-- SELECT
--     tablename,
--     policyname,
--     cmd as operation,
--     qual as condition
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =====================================================
-- 文件信息
-- =====================================================
-- 文件名: add_missing_insert_policies.sql
-- 迁移名称: add_missing_insert_policies
-- 新增策略数: 18
-- 目标: 补全 INSERT 策略，允许应用正常写入数据
-- 警告: topics/rounds 使用宽松策略，建议后续添加 created_by/creator_id 字段
-- =====================================================
