/**
 * 用户服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供用户服务
 * [POS]: lib/user/user-service.ts - 用户核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbUser, DbAgent } from '@/lib/supabase/types';

// ============================================
// 类型定义
// ============================================

export interface UserServiceConfig {}

export interface CreateUserInput {
  email: string;
  name?: string;
  avatar?: string;
  secondmeId?: string;
  interests?: string[];
  connectionTypes?: string[];
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  interests?: string[];
  connectionTypes?: string[];
  allowAgentAutoJoin?: boolean;
}

type UserWithRelations = DbUser & {
  agent?: DbAgent;
};

// ============================================
// 服务类
// ============================================

export class UserService {
  private config: UserServiceConfig;

  constructor(config: UserServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 创建用户
   */
  async createUser(input: CreateUserInput): Promise<UserWithRelations> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: input.email,
        name: input.name,
        avatar_url: input.avatar,
        secondme_id: input.secondmeId,
        interests: input.interests || [],
        connection_types: input.connectionTypes || [],
      })
      .select('*, agent:agents(*)')
      .single();

    if (error) throw new Error(`创建用户失败: ${error.message}`);
    return data as UserWithRelations;
  }

  /**
   * 获取用户
   */
  async getUser(userId: string): Promise<UserWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, agent:agents(*)')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取用户失败: ${error.message}`);
    return data as UserWithRelations | null;
  }

  /**
   * 通过邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<UserWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, agent:agents(*)')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取用户失败: ${error.message}`);
    return data as UserWithRelations | null;
  }

  /**
   * 通过 SecondMe ID 获取用户
   */
  async getUserBySecondMeId(secondmeId: string): Promise<UserWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, agent:agents(*)')
      .eq('secondme_id', secondmeId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`获取用户失败: ${error.message}`);
    return data as UserWithRelations | null;
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<UserWithRelations> {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.avatar !== undefined) updateData.avatar_url = input.avatar;
    if (input.interests !== undefined) updateData.interests = input.interests;
    if (input.connectionTypes !== undefined) updateData.connection_types = input.connectionTypes;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*, agent:agents(*)')
      .single();

    if (error) throw new Error(`更新用户失败: ${error.message}`);
    return data as UserWithRelations;
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw new Error(`删除用户失败: ${error.message}`);
  }

  /**
   * 更新用户兴趣
   */
  async updateUserInterests(userId: string, interests: string[]): Promise<UserWithRelations> {
    return this.updateUser(userId, { interests });
  }

  /**
   * 更新用户连接类型偏好
   */
  async updateUserConnectionTypes(userId: string, connectionTypes: string[]): Promise<UserWithRelations> {
    return this.updateUser(userId, { connectionTypes });
  }

  /**
   * 获取用户列表
   */
  async listUsers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ users: UserWithRelations[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*, agent:agents(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`获取用户列表失败: ${error.message}`);

    return {
      users: (data || []) as UserWithRelations[],
      total: count || 0,
    };
  }
}

// ============================================
// 单例导出
// ============================================

let instance: UserService | null = null;

export function getUserService(): UserService {
  if (!instance) {
    instance = new UserService();
  }
  return instance;
}

export function resetUserService(): void {
  instance = null;
}
