/**
 * 审计日志服务
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供审计日志记录与查询服务
 * [POS]: lib/audit/logger.ts - 审计日志核心服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import type { DbAuditLog } from '@/lib/supabase/types';

// ============================================
// 类型定义
// ============================================

export type AuditAction =
  | 'round.created' | 'round.joined' | 'round.left' | 'round.completed' | 'round.started' | 'round.deleted' | 'round.message.sent'
  | 'match.generated' | 'match.accepted' | 'match.declined'
  | 'debate.initiated' | 'debate.responded' | 'debate.completed'
  | 'cotrial.assigned' | 'cotrial.completed' | 'cotrial.rated' | 'cotrial.message_submitted';

export type ActorType = 'user' | 'agent' | 'system';
export type ResourceType = 'round' | 'match' | 'debate' | 'cotrial' | 'message';

export interface AuditActor {
  type: ActorType;
  id: string;
  sessionId?: string;
}

export interface AuditResource {
  type: ResourceType;
  id: string;
}

export interface AuditContext {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  traceId?: string;
}

export interface AuditLogInput {
  action: AuditAction;
  actor: AuditActor;
  resource: AuditResource;
  context?: AuditContext;
  metadata?: AuditMetadata;
}

export interface AuditLogQuery {
  action?: AuditAction;
  actorType?: ActorType;
  actorId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLoggerConfig {
  enableConsole?: boolean;
}

type AuditLogWithRelations = DbAuditLog;

// ============================================
// 审计日志服务类
// ============================================

export class AuditLogger {
  private config: AuditLoggerConfig;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      enableConsole: false,
      ...config,
    };
  }

  // ============================================
  // 记录审计日志
  // ============================================

  /**
   * 记录审计日志
   */
  async log(input: AuditLogInput): Promise<AuditLogWithRelations> {
    // 验证必填字段
    if (!input.action) {
      throw new Error('action is required');
    }
    if (!input.actor) {
      throw new Error('actor is required');
    }
    if (!input.resource) {
      throw new Error('resource is required');
    }

    // 生成请求 ID（如果没有提供）
    const requestId = input.metadata?.requestId || this.generateRequestId();
    const traceId = input.metadata?.traceId || this.generateTraceId();

    // 计算差异
    const diff = this.calculateDiff(input.context?.before, input.context?.after);

    // 构建数据库记录
    const data = {
      action: input.action,
      actor_type: input.actor.type,
      actor_id: input.actor.id,
      session_id: input.actor.sessionId,
      resource_type: input.resource.type,
      resource_id: input.resource.id,
      context_before: input.context?.before || {},
      context_after: input.context?.after || {},
      diff: diff || {},
      metadata: {
        ip: input.metadata?.ip,
        userAgent: input.metadata?.userAgent,
        requestId,
        traceId,
      },
    };

    // 写入数据库
    const { data: auditLog, error } = await supabaseAdmin
      .from('audit_logs')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`记录审计日志失败: ${error.message}`);

    // 控制台输出（可选）
    if (this.config.enableConsole) {
      this.consoleLog(auditLog);
    }

    return auditLog as AuditLogWithRelations;
  }

  // ============================================
  // 便捷方法
  // ============================================

  /**
   * 记录圆桌操作
   */
  async logRoundAction(
    action: 'round.created' | 'round.joined' | 'round.left' | 'round.completed' | 'round.started' | 'round.deleted',
    actor: AuditActor,
    roundId: string,
    context?: AuditContext,
    metadata?: AuditMetadata
  ): Promise<AuditLogWithRelations> {
    return this.log({ action, actor, resource: { type: 'round', id: roundId }, context, metadata });
  }

  /**
   * 记录知遇卡操作
   */
  async logMatchAction(
    action: 'match.generated' | 'match.accepted' | 'match.declined',
    actor: AuditActor,
    matchId: string,
    context?: AuditContext,
    metadata?: AuditMetadata
  ): Promise<AuditLogWithRelations> {
    return this.log({ action, actor, resource: { type: 'match', id: matchId }, context, metadata });
  }

  /**
   * 记录争鸣层操作
   */
  async logDebateAction(
    action: 'debate.initiated' | 'debate.responded' | 'debate.completed',
    actor: AuditActor,
    debateId: string,
    context?: AuditContext,
    metadata?: AuditMetadata
  ): Promise<AuditLogWithRelations> {
    return this.log({ action, actor, resource: { type: 'debate', id: debateId }, context, metadata });
  }

  /**
   * 记录共试层操作
   */
  async logCotrialAction(
    action: 'cotrial.assigned' | 'cotrial.completed' | 'cotrial.rated' | 'cotrial.message_submitted',
    actor: AuditActor,
    cotrialId: string,
    context?: AuditContext,
    metadata?: AuditMetadata
  ): Promise<AuditLogWithRelations> {
    return this.log({ action, actor, resource: { type: 'cotrial', id: cotrialId }, context, metadata });
  }

  // ============================================
  // 查询审计日志
  // ============================================

  /**
   * 查询审计日志
   */
  async query(query: AuditLogQuery): Promise<AuditLogWithRelations[]> {
    let q = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(query.limit || 100);

    if (query.offset) {
      q = q.range(query.offset, query.offset + (query.limit || 100) - 1);
    }

    if (query.action) {
      q = q.eq('action', query.action);
    }
    if (query.actorType) {
      q = q.eq('actor_type', query.actorType);
    }
    if (query.actorId) {
      q = q.eq('actor_id', query.actorId);
    }
    if (query.resourceType) {
      q = q.eq('resource_type', query.resourceType);
    }
    if (query.resourceId) {
      q = q.eq('resource_id', query.resourceId);
    }
    if (query.startTime) {
      q = q.gte('timestamp', query.startTime.toISOString());
    }
    if (query.endTime) {
      q = q.lte('timestamp', query.endTime.toISOString());
    }

    const { data, error } = await q;
    if (error) throw new Error(`查询审计日志失败: ${error.message}`);

    return (data || []) as AuditLogWithRelations[];
  }

  /**
   * 获取资源的审计历史
   */
  async getResourceHistory(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<AuditLogWithRelations[]> {
    return this.query({
      resourceType,
      resourceId,
    });
  }

  /**
   * 获取用户的操作历史
   */
  async getUserHistory(
    userId: string,
    options?: { limit?: number; startTime?: Date; endTime?: Date }
  ): Promise<AuditLogWithRelations[]> {
    return this.query({
      actorType: 'user',
      actorId: userId,
      limit: options?.limit,
      startTime: options?.startTime,
      endTime: options?.endTime,
    });
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 计算前后差异
   */
  private calculateDiff(
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ): Record<string, unknown> | null {
    if (!before && !after) {
      return null;
    }

    const diff: Record<string, unknown> = {};
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of Array.from(allKeys)) {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];

      if (beforeValue !== afterValue) {
        diff[key] = {
          before: beforeValue,
          after: afterValue,
        };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成追踪 ID
   */
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 控制台输出
   */
  private consoleLog(auditLog: AuditLogWithRelations): void {
    const timestamp = new Date(auditLog.timestamp).toISOString();
    const color = this.getActionColor(auditLog.action);
    console.log(
      `%c[${timestamp}] %c${auditLog.action}%c - ${auditLog.actor_type}:${auditLog.actor_id} -> ${auditLog.resource_type}:${auditLog.resource_id}`,
      'color: gray',
      `color: ${color}; font-weight: bold`,
      'color: inherit'
    );
  }

  /**
   * 根据操作类型获取颜色
   */
  private getActionColor(action: string): string {
    if (action.startsWith('round.')) return '#3b82f6'; // 蓝色
    if (action.startsWith('match.')) return '#8b5cf6'; // 紫色
    if (action.startsWith('debate.')) return '#f59e0b'; // 橙色
    if (action.startsWith('cotrial.')) return '#10b981'; // 绿色
    return '#6b7280'; // 灰色
  }
}

// ============================================
// 单例导出
// ============================================

let instance: AuditLogger | null = null;

/**
 * 获取 AuditLogger 实例
 */
export function getAuditLogger(): AuditLogger {
  if (!instance) {
    instance = new AuditLogger();
  }
  return instance;
}

/**
 * 重置审计日志实例（用于测试）
 */
export function resetAuditLogger(): void {
  instance = null;
}
