/**
 * Agent 模式管理
 * [INPUT]: 依赖 lib/supabase/client 的 supabaseAdmin
 * [OUTPUT]: 对外提供 Agent 模式管理服务
 * [POS]: lib/entry/agent-mode.ts - 入口层 Agent 模式核心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================
// 类型定义
// ============================================

export interface AgentMode {
  mode: 'human' | 'agent';
  agentId?: string;
  autoAction: boolean;
  humanIntervention: boolean;
  behaviorLogging: boolean;
}

export interface AgentModeConfig {
  defaultMode?: AgentMode['mode'];
  defaultAgentId?: string;
  defaultAutoAction?: boolean;
  defaultHumanIntervention?: boolean;
  defaultBehaviorLogging?: boolean;
}

// 预设模式
export const PRESET_MODES = {
  HUMAN: {
    mode: 'human' as const,
    autoAction: false,
    humanIntervention: false,
    behaviorLogging: false,
  },
  AGENT_FULLY_AUTONOMOUS: {
    mode: 'agent' as const,
    autoAction: true,
    humanIntervention: false,
    behaviorLogging: true,
  },
  AGENT_WITH_INTERVENTION: {
    mode: 'agent' as const,
    autoAction: true,
    humanIntervention: true,
    behaviorLogging: true,
  },
} as const;

// ============================================
// 服务类
// ============================================

export class AgentModeService {
  private config: Required<AgentModeConfig>;
  private currentMode: AgentMode;
  private userId: string | null = null;

  constructor(config: AgentModeConfig = {}) {
    this.config = {
      defaultMode: config.defaultMode ?? 'human',
      defaultAgentId: config.defaultAgentId ?? '',
      defaultAutoAction: config.defaultAutoAction ?? false,
      defaultHumanIntervention: config.defaultHumanIntervention ?? false,
      defaultBehaviorLogging: config.defaultBehaviorLogging ?? false,
    };

    this.currentMode = this.createDefaultMode();
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 创建默认模式
   */
  createDefaultMode(): AgentMode {
    return {
      mode: this.config.defaultMode,
      agentId: this.config.defaultAgentId || undefined,
      autoAction: this.config.defaultAutoAction,
      humanIntervention: this.config.defaultHumanIntervention,
      behaviorLogging: this.config.defaultBehaviorLogging,
    };
  }

  /**
   * 获取当前模式
   */
  getMode(): AgentMode {
    return { ...this.currentMode };
  }

  /**
   * 设置用户 ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * 切换到人类模式
   */
  switchToHumanMode(): AgentMode {
    this.currentMode = {
      ...PRESET_MODES.HUMAN,
    };
    return this.getMode();
  }

  /**
   * 切换到 Agent 完全自主模式
   */
  switchToAgentAutonomous(agentId: string): AgentMode {
    this.currentMode = {
      mode: 'agent',
      agentId,
      autoAction: true,
      humanIntervention: false,
      behaviorLogging: true,
    };
    return this.getMode();
  }

  /**
   * 切换到 Agent 可干预模式
   */
  switchToAgentWithIntervention(agentId: string): AgentMode {
    this.currentMode = {
      mode: 'agent',
      agentId,
      autoAction: true,
      humanIntervention: true,
      behaviorLogging: true,
    };
    return this.getMode();
  }

  /**
   * 切换 Agent 模式
   */
  switchMode(mode: AgentMode): AgentMode {
    this.currentMode = { ...mode };
    return this.getMode();
  }

  /**
   * 启用自动行动
   */
  enableAutoAction(): AgentMode {
    this.currentMode.autoAction = true;
    return this.getMode();
  }

  /**
   * 禁用自动行动
   */
  disableAutoAction(): AgentMode {
    this.currentMode.autoAction = false;
    return this.getMode();
  }

  /**
   * 启用人类干预
   */
  enableHumanIntervention(): AgentMode {
    this.currentMode.humanIntervention = true;
    return this.getMode();
  }

  /**
   * 禁用人类干预
   */
  disableHumanIntervention(): AgentMode {
    this.currentMode.humanIntervention = false;
    return this.getMode();
  }

  /**
   * 启用行为日志
   */
  enableBehaviorLogging(): AgentMode {
    this.currentMode.behaviorLogging = true;
    return this.getMode();
  }

  /**
   * 禁用行为日志
   */
  disableBehaviorLogging(): AgentMode {
    this.currentMode.behaviorLogging = false;
    return this.getMode();
  }

  /**
   * 检查是否为 Agent 模式
   */
  isAgentMode(): boolean {
    return this.currentMode.mode === 'agent';
  }

  /**
   * 检查是否为人类模式
   */
  isHumanMode(): boolean {
    return this.currentMode.mode === 'human';
  }

  /**
   * 检查是否自动行动
   */
  isAutoActionEnabled(): boolean {
    return this.currentMode.autoAction;
  }

  /**
   * 检查人类是否可以干预
   */
  canHumanIntervention(): boolean {
    return this.currentMode.humanIntervention;
  }

  /**
   * 检查是否记录行为日志
   */
  isBehaviorLoggingEnabled(): boolean {
    return this.currentMode.behaviorLogging;
  }

  /**
   * 验证模式配置是否有效
   */
  validateMode(mode: AgentMode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (mode.mode === 'agent' && !mode.agentId) {
      errors.push('Agent 模式必须提供 agentId');
    }

    if (mode.mode === 'agent' && !mode.autoAction && mode.humanIntervention) {
      errors.push('关闭自动行动时，人类干预无意义');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 从预设模式切换
   */
  applyPreset(preset: keyof typeof PRESET_MODES, agentId?: string): AgentMode {
    const mode = PRESET_MODES[preset];
    if (preset.includes('AGENT') && agentId) {
      return this.switchMode({
        ...mode,
        agentId,
      });
    }
    return this.switchMode({ ...mode });
  }

  /**
   * 重置为默认模式
   */
  reset(): AgentMode {
    this.currentMode = this.createDefaultMode();
    return this.getMode();
  }

  /**
   * 序列化模式用于存储
   */
  serialize(): string {
    return JSON.stringify(this.currentMode);
  }

  /**
   * 从存储恢复模式
   */
  deserialize(data: string): AgentMode {
    try {
      const parsed = JSON.parse(data) as AgentMode;
      const validation = this.validateMode(parsed);
      if (validation.valid) {
        this.currentMode = parsed;
      }
      return this.getMode();
    } catch {
      return this.createDefaultMode();
    }
  }
}

// ============================================
// 单例导出
// ============================================

let instance: AgentModeService | null = null;

export function getAgentModeService(): AgentModeService {
  if (!instance) {
    instance = new AgentModeService();
  }
  return instance;
}

export function resetAgentModeService(): void {
  instance = null;
}
