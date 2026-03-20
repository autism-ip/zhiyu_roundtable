/**
 * Supabase 数据库类型定义
 * [INPUT]: 依赖 Supabase 环境变量
 * [OUTPUT]: 提供所有数据库表的 TypeScript 类型
 * [POS]: lib/supabase/types.ts - 数据层类型定义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// =============================================================================
// 基础类型
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamptz = string;

// =============================================================================
// Database Tables
// =============================================================================

export interface DbUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  secondme_id: string | null;
  interests: string[] | null;
  connection_types: string[] | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbAgent {
  id: string;
  user_id: string;
  name: string;
  personality: string | null;
  expertise: string[] | null;
  tone: string | null;
  is_active: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbTopic {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  zhihu_id: string | null;
  zhihu_url: string | null;
  status: string;
  // 知乎扩展字段
  topic_source: string | null;   // 来源: manual/zhihu_billboard/zhihu_search
  heat_score: number;            // 知乎热度分
  zhihu_rank: number;            // 知乎榜单排名，0表示未上榜
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbRound {
  id: string;
  topic_id: string | null;
  name: string;
  description: string | null;
  max_agents: number;
  status: string;
  summary: string | null;
  insights: Json | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbRoundParticipant {
  id: string;
  round_id: string;
  user_id: string;
  agent_id: string | null;
  role: string;
  joined_at: Timestamptz;
  left_at: Timestamptz | null;
}

export interface DbMessage {
  id: string;
  round_id: string;
  agent_id: string | null;
  content: string;
  type: string;
  metadata: Json | null;
  reply_to: string | null;
  created_at: Timestamptz;
}

export interface DbMatch {
  id: string;
  round_id: string | null;
  user_a_id: string;
  user_b_id: string;
  complementarity_score: number | null;
  future_generativity: number | null;
  overall_score: number | null;
  relationship_type: string | null;
  match_reason: string | null;
  complementarity_areas: string[] | null;
  insights: Json | null;
  status: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbDebate {
  id: string;
  match_id: string;
  scenario: string | null;
  questions: Json | null;
  responses: Json | null;
  analysis: Json | null;
  relationship_suggestion: string | null;
  should_connect: boolean | null;
  risk_areas: string[] | null;
  next_steps: string[] | null;
  status: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbCotrial {
  id: string;
  debate_id: string;
  task_type: string | null;
  task_description: string | null;
  task_goal: string | null;
  task_duration: string | null;
  result: string | null;
  completed: boolean;
  completed_at: Timestamptz | null;
  feedback_a: Json | null;
  feedback_b: Json | null;
  continued: boolean | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export interface DbAuditLog {
  id: string;
  timestamp: Timestamptz;
  action: string;
  actor_type: string;
  actor_id: string;
  session_id: string | null;
  resource_type: string;
  resource_id: string;
  context_before: Json;
  context_after: Json;
  diff: Json | null;
  metadata: Json | null;
}

// =============================================================================
// 关系类型 (用于关联查询)
// =============================================================================

export interface DbMatchWithUsers extends DbMatch {
  user_a: DbUser;
  user_b: DbUser;
  round?: DbRound;
}

export interface DbDebateWithMatch extends DbDebate {
  match: DbMatch;
}

export interface DbCotrialWithDebate extends DbCotrial {
  debate: DbDebate;
}

export interface DbRoundWithTopic extends DbRound {
  topic: DbTopic;
}

export interface DbRoundParticipantWithUser extends DbRoundParticipant {
  user: DbUser;
  agent?: DbAgent;
}

export interface DbMessageWithAgent extends DbMessage {
  agent?: DbAgent;
}

// =============================================================================
// 类型别名 (兼容现有代码)
// =============================================================================

export type User = DbUser;
export type Agent = DbAgent;
export type Topic = DbTopic;
export type Round = DbRound;
export type Match = DbMatch;
export type Debate = DbDebate;
export type Cotrial = DbCotrial;
export type AuditLog = DbAuditLog;
export type Message = DbMessage;
