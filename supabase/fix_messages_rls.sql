-- =====================================================
-- Fix: Messages RLS 修复
-- 日期: 2026-03-20
-- 问题: Cookie-based auth (SecondMe) 与 Supabase RLS auth.uid() 不兼容
--       导致参与者访问自己的消息时被 RLS 阻止
-- 解决方案: 禁用 messages 表 RLS，由应用层 (isParticipant check) 控制授权
-- =====================================================

-- Step 1: 删除原有的 RLS 策略
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

-- Step 2: 禁用 messages 表的 RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 验证 RLS 状态
SELECT relname, relrowsecurity FROM pg_class
WHERE relkind = 'r' AND relnamespace = 'public'
AND relname IN ('messages', 'round_participants', 'rounds');
