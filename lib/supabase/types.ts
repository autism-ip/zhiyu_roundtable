/**
 * [INPUT]: 依赖 Database 类型定义
 * [OUTPUT]: 对外提供类型化的 Supabase 数据库类型
 * [POS]: lib/supabase/types.ts - Supabase 类型定义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          action: string;
          actor_type: 'user' | 'agent' | 'system';
          actor_id: string;
          session_id: string | null;
          resource_type: string;
          resource_id: string;
          context_before: Json;
          context_after: Json;
          diff: Json | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          timestamp?: string;
          action: string;
          actor_type: 'user' | 'agent' | 'system';
          actor_id: string;
          session_id?: string | null;
          resource_type: string;
          resource_id: string;
          context_before?: Json;
          context_after?: Json;
          diff?: Json | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          timestamp?: string;
          action?: string;
          actor_type?: 'user' | 'agent' | 'system';
          actor_id?: string;
          session_id?: string | null;
          resource_type?: string;
          resource_id?: string;
          context_before?: Json;
          context_after?: Json;
          diff?: Json | null;
          metadata?: Json | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          secondme_id: string | null;
          interests: string[] | null;
          connection_types: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          secondme_id?: string | null;
          interests?: string[] | null;
          connection_types?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          secondme_id?: string | null;
          interests?: string[] | null;
          connection_types?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rounds: {
        Row: {
          id: string;
          topic_id: string | null;
          name: string;
          description: string | null;
          max_agents: number;
          status: string;
          summary: string | null;
          insights: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id?: string | null;
          name: string;
          description?: string | null;
          max_agents?: number;
          status?: string;
          summary?: string | null;
          insights?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string | null;
          name?: string;
          description?: string | null;
          max_agents?: number;
          status?: string;
          summary?: string | null;
          insights?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_id?: string | null;
          user_a_id: string;
          user_b_id: string;
          complementarity_score?: number | null;
          future_generativity?: number | null;
          overall_score?: number | null;
          relationship_type?: string | null;
          match_reason?: string | null;
          complementarity_areas?: string[] | null;
          insights?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string | null;
          user_a_id?: string;
          user_b_id?: string;
          complementarity_score?: number | null;
          future_generativity?: number | null;
          overall_score?: number | null;
          relationship_type?: string | null;
          match_reason?: string | null;
          complementarity_areas?: string[] | null;
          insights?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
