/**
 * Supabase 客户端配置
 * [INPUT]: 依赖 @supabase/supabase-js、环境变量
 * [OUTPUT]: 提供浏览器端和服务端 Supabase 客户端
 * [POS]: lib/supabase/client.ts - 数据层客户端入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// 环境变量验证
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证公共环境变量（客户端需要）
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// =============================================================================
// 客户端类型
// =============================================================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          avatar_url: string | null;
          secondme_id: string | null;
          interests: string[] | null;
          connection_types: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          personality: string | null;
          expertise: string[] | null;
          tone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      topics: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          tags: string[] | null;
          zhihu_id: string | null;
          zhihu_url: string | null;
          status: string;
          // 知乎扩展字段
          topic_source: string | null;
          heat_score: number;
          zhihu_rank: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['topics']['Insert']>;
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
          insights: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rounds']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['rounds']['Insert']>;
      };
      round_participants: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          agent_id: string | null;
          role: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['round_participants']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['round_participants']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          round_id: string;
          agent_id: string | null;
          content: string;
          type: string;
          metadata: unknown | null;
          reply_to: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
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
          insights: unknown | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      debates: {
        Row: {
          id: string;
          match_id: string;
          scenario: string | null;
          questions: unknown | null;
          responses: unknown | null;
          analysis: unknown | null;
          relationship_suggestion: string | null;
          should_connect: boolean | null;
          risk_areas: string[] | null;
          next_steps: string[] | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['debates']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['debates']['Insert']>;
      };
      cotrials: {
        Row: {
          id: string;
          debate_id: string;
          task_type: string | null;
          task_description: string | null;
          task_goal: string | null;
          task_duration: string | null;
          result: string | null;
          completed: boolean;
          completed_at: string | null;
          feedback_a: unknown | null;
          feedback_b: unknown | null;
          continued: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cotrials']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cotrials']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          action: string;
          actor_type: string;
          actor_id: string;
          session_id: string | null;
          resource_type: string;
          resource_id: string;
          context_before: unknown;
          context_after: unknown;
          diff: unknown | null;
          metadata: unknown | null;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
};

// =============================================================================
// 客户端实例
// =============================================================================

/**
 * 浏览器端 Supabase 客户端
 * 使用 Anon Key，有 RLS 限制
 * 用于: 客户端组件、API 路由中的用户请求
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}) as any;

/**
 * 服务端管理客户端
 * 使用 Service Role Key，绕过 RLS
 * 仅用于: 服务器端管理操作、API 路由中的后台任务
 * 注意: Service Role Key 仅在服务端使用，不会暴露给客户端
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceKey || 'missing-service-key', // 防止空字符串
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
) as any;

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 获取当前会话用户 ID
 * 用于 API 路由中获取认证用户
 */
export async function getSessionUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * 验证用户是否为自己数据的拥有者
 * 用于 RLS 策略验证后的额外检查
 */
export async function validateUserOwnership(
  userId: string,
  resourceType: 'users' | 'agents' | 'matches',
  resourceId: string
): Promise<boolean> {
  if (resourceType === 'users') {
    return resourceId === userId;
  }

  if (resourceType === 'agents') {
    const { data } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', resourceId)
      .single();
    return data?.user_id === userId;
  }

  if (resourceType === 'matches') {
    const { data } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('id', resourceId)
      .single();
    return data?.user_a_id === userId || data?.user_b_id === userId;
  }

  return false;
}
