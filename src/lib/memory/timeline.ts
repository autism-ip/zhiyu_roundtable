/**
 * 时间线服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin, lib/audit/logger 的 AuditLogger
 * [OUTPUT]: 对外提供用户活动时间线查询服务
 * [POS]: lib/memory/timeline.ts - 回忆功能核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbAuditLog } from '@/lib/supabase/types';

// ============================================
// 类型定义
// ============================================

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
  };
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  summary: string;
}

export interface TimelineQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface TimelineServiceConfig {
  maxLimit?: number;
}

// ============================================
// 动作到摘要的映射
// ============================================

const ACTION_SUMMARY_MAP: Record<string, string> = {
  // Round actions
  'round.created': '创建了圆桌',
  'round.joined': '加入了圆桌',
  'round.left': '离开了圆桌',
  'round.started': '开始了圆桌讨论',
  'round.completed': '完成了圆桌讨论',
  'round.message.sent': '在圆桌中发送了消息',

  // Match actions
  'match.generated': '获得了新的知遇卡',
  'match.accepted': '接受了知遇连接',
  'match.declined': '婉拒了知遇连接',

  // Debate actions
  'debate.initiated': '发起了争鸣对练',
  'debate.responded': '完成了争鸣回应',
  'debate.completed': '完成了争鸣对练',

  // Cotrial actions
  'cotrial.assigned': '被分配了共试任务',
  'cotrial.completed': '完成了共试任务',
  'cotrial.rated': '评价了共试结果',
};

// ============================================
// 时间线服务类
// ============================================

export class TimelineService {
  private config: TimelineServiceConfig;

  constructor(config: TimelineServiceConfig = {}) {
    this.config = {
      maxLimit: 100,
      ...config,
    };
  }

  // ============================================
  // 核心查询方法
  // ============================================

  /**
   * 获取用户的时间线事件
   */
  async getUserTimeline(
    userId: string,
    options: TimelineQueryOptions = {}
  ): Promise<TimelineEvent[]> {
    const limit = Math.min(options.limit || 20, this.config.maxLimit || 100);
    const offset = options.offset || 0;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('actor_type', 'user')
      .eq('actor_id', userId);

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取用户时间线失败: ${error.message}`);
    }

    return this.formatEvents((data || []) as DbAuditLog[]);
  }

  /**
   * 获取资源的时间线事件
   */
  async getResourceTimeline(
    resourceType: string,
    resourceId: string,
    options: TimelineQueryOptions = {}
  ): Promise<TimelineEvent[]> {
    const limit = Math.min(options.limit || 20, this.config.maxLimit || 100);
    const offset = options.offset || 0;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query = query.lte('timestamp', options.endDate.toISOString());
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取资源时间线失败: ${error.message}`);
    }

    return this.formatEvents((data || []) as DbAuditLog[]);
  }

  /**
   * 获取最近的聚合活动
   */
  async getRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<TimelineEvent[]> {
    const actualLimit = Math.min(limit, this.config.maxLimit || 100);

    // 查询用户相关的所有事件
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .or(`actor_id.eq.${userId},resource_id.eq.${userId}`)
      .order('timestamp', { ascending: false })
      .limit(actualLimit);

    if (error) {
      throw new Error(`获取最近活动失败: ${error.message}`);
    }

    return this.formatEvents((data || []) as DbAuditLog[]);
  }

  // ============================================
  // 格式化方法
  // ============================================

  /**
   * 格式化审计日志为时间线事件
   */
  private formatEvents(events: DbAuditLog[]): TimelineEvent[] {
    return events.map(event => this.formatEvent(event));
  }

  /**
   * 格式化单个审计日志为时间线事件
   */
  private formatEvent(event: DbAuditLog): TimelineEvent {
    return {
      id: event.id,
      timestamp: event.timestamp,
      action: event.action,
      actor: {
        type: event.actor_type as 'user' | 'agent' | 'system',
        id: event.actor_id,
      },
      resource: {
        type: event.resource_type,
        id: event.resource_id,
        name: this.extractResourceName(event),
      },
      summary: this.generateSummary(event),
    };
  }

  /**
   * 从事件中提取资源名称
   */
  private extractResourceName(event: DbAuditLog): string | undefined {
    const contextAfter = event.context_after as Record<string, any> || {};

    // 尝试从 context_after 中获取名称
    if (contextAfter.name) return contextAfter.name;
    if (contextAfter.title) return contextAfter.title;

    return undefined;
  }

  /**
   * 生成事件摘要
   */
  private generateSummary(event: DbAuditLog): string {
    // 首先尝试从映射中获取
    const mappedSummary = ACTION_SUMMARY_MAP[event.action];
    if (mappedSummary) {
      return mappedSummary;
    }

    // 生成默认摘要
    const actorTypeMap: Record<string, string> = {
      user: '用户',
      agent: 'Agent',
      system: '系统',
    };

    const actorDesc = actorTypeMap[event.actor_type] || event.actor_type;
    const resourceDesc = event.resource_type;

    return `${actorDesc}对${resourceDesc}执行了${event.action}`;
  }
}

// ============================================
// 单例导出
// ============================================

let instance: TimelineService | null = null;

export function getTimelineService(): TimelineService {
  if (!instance) {
    instance = new TimelineService();
  }
  return instance;
}

export function resetTimelineService(): void {
  instance = null;
}
