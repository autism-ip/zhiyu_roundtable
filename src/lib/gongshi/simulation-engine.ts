/**
 * [INPUT]: 依赖 @/lib/supabase/client 的 supabaseAdmin，依赖 @/lib/ai/minimax-client 的 getMinimaxClient
 * [OUTPUT]: 对外提供 SimulationEngine 类和 simulationEngine 单例
 * [POS]: src/lib/gongshi/simulation-engine.ts - 共试层模拟引擎
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { getMinimaxClient, type MinimaxClient } from '@/lib/ai/minimax-client';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 模拟引擎状态
 */
export enum SimulationState {
  IDLE = 'idle',
  INITIALIZED = 'initialized',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 干预级别
 */
export type InterventionLevel = 'observe' | 'suggest' | 'interrupt';

/**
 * 干预记录
 */
export interface Intervention {
  level: InterventionLevel;
  timestamp: Date;
  userId: string;
  content?: string;
  reason?: string;
  agentResponse?: {
    adopted: boolean;
    reasoning: string;
  };
}

/**
 * 模拟角色
 */
export interface SimulationCharacter {
  id: string;
  role: string;
  personality: string;
  goals: string[];
  currentState?: Record<string, any>;
}

/**
 * 模拟场景
 */
export interface SimulationScenario {
  id: string;
  description: string;
  initialContext: Record<string, any>;
  characters: SimulationCharacter[];
  expectedOutcomes?: string[];
}

/**
 * 模拟事件
 */
export interface SimulationEvent {
  id: string;
  type: 'action' | 'dialogue' | 'decision' | 'intervention';
  timestamp: Date;
  actor?: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * 模拟指标
 */
export interface SimulationMetrics {
  trust: number;        // 信任度 0-100
  alignment: number;    // 一致性 0-100
  conflict: number;     // 冲突值 0-100
  creativity: number;  // 创造力 0-100
  outcome: number;      // 结果评分 0-100
  coherence: number;    // 连贯性 0-100
}

/**
 * 模拟引擎配置
 */
export interface SimulationEngineConfig {
  /** 最大迭代次数 */
  maxIterations: number;
  /** MiniMax 模型 */
  minimaxModel: string;
  /** 默认干预级别 */
  defaultInterventionLevel: InterventionLevel;
}

// =============================================================================
// 默认配置
// =============================================================================

const DEFAULT_CONFIG: SimulationEngineConfig = {
  maxIterations: 20,
  minimaxModel: 'abab6.5s-chat',
  defaultInterventionLevel: 'observe',
};

// =============================================================================
// 模拟引擎类
// =============================================================================

/**
 * 模拟引擎 - 共试层核心组件
 *
 * 负责：
 * 1. 根据辩论层结果初始化模拟场景
 * 2. 运行多轮模拟，记录事件和指标
 * 3. 支持人类干预（旁观/提示/中断）
 * 4. 生成模拟结果报告
 */
export class SimulationEngine {
  private config: SimulationEngineConfig;
  private minimaxClient: MinimaxClient;
  private state: SimulationState;
  private debateId: string | null;
  private scenario: SimulationScenario | null;
  private events: SimulationEvent[];
  private interventions: Intervention[];
  private metrics: SimulationMetrics;
  private currentIteration: number;
  private paused: boolean;

  constructor(config: Partial<SimulationEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.minimaxClient = getMinimaxClient({ model: this.config.minimaxModel });
    this.state = SimulationState.IDLE;
    this.debateId = null;
    this.scenario = null;
    this.events = [];
    this.interventions = [];
    this.metrics = {
      trust: 50,
      alignment: 50,
      conflict: 50,
      creativity: 50,
      outcome: 50,
      coherence: 50,
    };
    this.currentIteration = 0;
    this.paused = false;
  }

  /**
   * 获取当前状态
   */
  getState(): SimulationState {
    return this.state;
  }

  /**
   * 获取当前辩论 ID
   */
  getDebateId(): string | null {
    return this.debateId;
  }

  /**
   * 获取模拟场景
   */
  getScenario(): SimulationScenario | null {
    return this.scenario;
  }

  /**
   * 获取模拟指标
   */
  getMetrics(): SimulationMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取模拟历史
   */
  getHistory(): SimulationEvent[] {
    return [...this.events];
  }

  /**
   * 获取干预记录
   */
  getInterventions(): Intervention[] {
    return [...this.interventions];
  }

  /**
   * 初始化模拟引擎
   * @param debateId 关联的辩论 ID
   */
  async initialize(debateId: string): Promise<void> {
    // 1. 获取辩论数据
    const debate = await this.getDebate(debateId);
    if (!debate) {
      throw new Error('辩论不存在');
    }

    // 2. 生成模拟场景
    const scenarioData = await this.generateScenario(debate);

    // 3. 初始化状态
    this.debateId = debateId;
    this.scenario = scenarioData;
    this.events = [];
    this.interventions = [];
    this.currentIteration = 0;
    this.metrics = {
      trust: 50,
      alignment: 50,
      conflict: 50,
      creativity: 50,
      outcome: 50,
      coherence: 50,
    };
    this.state = SimulationState.INITIALIZED;
  }

  /**
   * 启动模拟
   * 注意：这是一个异步方法，但模拟会在后台运行
   * 状态会立即变为 RUNNING，然后根据迭代情况变为 COMPLETED
   */
  async start(): Promise<void> {
    if (this.state === SimulationState.IDLE) {
      throw new Error('请先初始化引擎');
    }

    if (this.state === SimulationState.RUNNING) {
      throw new Error('模拟已在运行中');
    }

    this.state = SimulationState.RUNNING;
    this.paused = false;

    // 异步运行模拟循环（不等待完成）
    // 这样调用者可以检查状态
    setTimeout(() => {
      this.runSimulationLoop().catch((err) => {
        console.error('模拟循环异常:', err);
        this.state = SimulationState.FAILED;
      });
    }, 0);

    // 等待一小段时间让模拟开始
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * 暂停模拟
   */
  pause(): void {
    if (this.state === SimulationState.RUNNING) {
      this.paused = true;
      this.state = SimulationState.PAUSED;
    }
    // 如果不是 RUNNING 状态，忽略（模拟已结束或未开始）
  }

  /**
   * 恢复模拟
   */
  resume(): void {
    if (this.state === SimulationState.PAUSED) {
      this.paused = false;
      this.state = SimulationState.RUNNING;
    }
    // 如果不是 PAUSED 状态，忽略
  }

  /**
   * 停止模拟
   */
  async stop(): Promise<void> {
    this.state = SimulationState.COMPLETED;
    this.paused = false;

    // 保存最终状态到数据库
    await this.saveSimulationResult();
  }

  /**
   * 干预模拟
   * @param level 干预级别
   * @param userId 用户 ID
   * @param content 干预内容
   * @param reason 中断原因（interrupt 级别必填）
   */
  intervene(
    level: InterventionLevel,
    userId: string,
    content?: string,
    reason?: string
  ): Intervention {
    const intervention: Intervention = {
      level,
      timestamp: new Date(),
      userId,
      content,
      reason,
    };

    this.interventions.push(intervention);

    // 记录干预事件
    this.addEvent({
      id: crypto.randomUUID(),
      type: 'intervention',
      timestamp: new Date(),
      actor: userId,
      content: `干预: ${level}${content ? ` - ${content}` : ''}`,
      metadata: { intervention },
    });

    // 根据干预级别处理
    if (level === 'interrupt') {
      // 中断：强制暂停模拟（不检查状态）
      if (this.state === SimulationState.RUNNING) {
        this.paused = true;
        this.state = SimulationState.PAUSED;
      }
    }

    return intervention;
  }

  /**
   * 评估当前模拟状态
   */
  async evaluate(): Promise<SimulationMetrics> {
    // 基于事件历史和干预记录更新指标
    await this.updateMetrics();
    return this.getMetrics();
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 获取辩论数据
   */
  private async getDebate(debateId: string): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (error) {
      console.error('获取辩论失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 生成模拟场景
   */
  private async generateScenario(debate: any): Promise<SimulationScenario> {
    try {
      const systemPrompt = '你是一个模拟场景生成专家。';
      const userPrompt = `基于以下辩论信息，生成一个模拟场景：

关系建议: ${debate.relationship_suggestion}
风险领域: ${debate.risk_areas?.join(', ') || '无'}
下一步行动: ${debate.next_steps?.join(', ') || '无'}

请生成一个适合这个关系的模拟场景，包括：
1. scenario: 场景描述
2. characters: 角色列表（每个角色包含 id, role, personality, goals）

请返回 JSON 格式。`;

      const result = await this.minimaxClient.chatJSON<{
        scenario?: string;
        characters?: Array<{ id: string; role: string; personality: string; goals: string[] }>;
      }>(systemPrompt, userPrompt);

      const parsed = result;

      return {
        id: `scenario-${Date.now()}`,
        description: parsed.scenario || '默认模拟场景',
        initialContext: {},
        characters: parsed.characters || [],
      };
    } catch (error) {
      console.error('生成场景失败，使用默认场景:', error);

      // 返回默认场景
      return {
        id: `scenario-${Date.now()}`,
        description: debate.scenario || '默认模拟场景',
        initialContext: {},
        characters: [
          { id: 'char-1', role: '角色A', personality: '积极', goals: ['目标1'] },
          { id: 'char-2', role: '角色B', personality: '稳健', goals: ['目标2'] },
        ],
      };
    }
  }

  /**
   * 运行模拟循环
   */
  private async runSimulationLoop(): Promise<void> {
    while (
      this.state === SimulationState.RUNNING &&
      !this.paused &&
      this.currentIteration < this.config.maxIterations
    ) {
      this.currentIteration++;

      // 生成下一步事件
      const event = await this.generateNextEvent();

      // 添加到历史
      this.addEvent(event);

      // 更新指标
      await this.updateMetrics();

      // 检查是否达到结束条件
      if (this.shouldEndSimulation()) {
        await this.stop();
        break;
      }
    }

    // 达到最大迭代次数，正常结束
    if (this.currentIteration >= this.config.maxIterations) {
      await this.stop();
    }
  }

  /**
   * 生成下一步事件
   */
  private async generateNextEvent(): Promise<SimulationEvent> {
    try {
      const context = this.buildContext();

      const systemPrompt = '你是一个模拟事件生成专家。';
      const userPrompt = `基于以下上下文，生成下一个模拟事件：

${context}

请生成一个事件，包含：
1. type: 事件类型 (action/dialogue/decision)
2. actor: 事件执行者
3. content: 事件内容

请返回 JSON 格式。`;

      const result = await this.minimaxClient.chatJSON<{
        type?: 'action' | 'dialogue' | 'decision';
        actor?: string;
        content?: string;
        metadata?: Record<string, any>;
      }>(systemPrompt, userPrompt);

      const parsed = result;

      return {
        id: `event-${Date.now()}-${this.currentIteration}`,
        type: parsed.type || 'action',
        timestamp: new Date(),
        actor: parsed.actor,
        content: parsed.content || '',
        metadata: parsed.metadata,
      };
    } catch (error) {
      console.error('生成事件失败:', error);

      // 返回默认事件
      return {
        id: `event-${Date.now()}-${this.currentIteration}`,
        type: 'action',
        timestamp: new Date(),
        content: '模拟事件进行中...',
      };
    }
  }

  /**
   * 构建上下文
   */
  private buildContext(): string {
    const recentEvents = this.events.slice(-5);
    const recentHistory = recentEvents
      .map((e) => `[${e.type}] ${e.actor || 'System'}: ${e.content}`)
      .join('\n');

    const activeInterventions = this.interventions
      .filter((i) => i.level === 'suggest' && !i.agentResponse)
      .map((i) => `建议: ${i.content}`)
      .join('\n');

    return `
当前迭代: ${this.currentIteration}/${this.config.maxIterations}
场景: ${this.scenario?.description || '未知'}

最近事件:
${recentHistory || '暂无'}

${activeInterventions ? `活跃建议:\n${activeInterventions}` : ''}
`.trim();
  }

  /**
   * 添加事件
   */
  private addEvent(event: SimulationEvent): void {
    this.events.push(event);
  }

  /**
   * 检查是否应该结束模拟
   */
  private shouldEndSimulation(): boolean {
    // 如果冲突值过高，提前结束
    if (this.metrics.conflict > 90) {
      return true;
    }

    // 如果信任度过低，提前结束
    if (this.metrics.trust < 10) {
      return true;
    }

    // 如果outcome已经很高，可以提前结束
    if (this.metrics.outcome > 85 && this.currentIteration >= 5) {
      return true;
    }

    return false;
  }

  /**
   * 更新模拟指标
   */
  private async updateMetrics(): Promise<void> {
    // 基于事件历史计算指标
    const eventCount = this.events.length;
    const interventionCount = this.interventions.length;

    // 信任度：基于 action 类型事件比例
    const actionEvents = this.events.filter((e) => e.type === 'action');
    this.metrics.trust = Math.min(100, 30 + actionEvents.length * 5);

    // 一致性：基于对话连贯性（简化的启发式计算）
    this.metrics.alignment = Math.min(100, 40 + this.currentIteration * 3);

    // 冲突值：基于干预数量
    this.metrics.conflict = Math.min(100, interventionCount * 15);

    // 创造力：基于 decision 类型事件
    const decisionEvents = this.events.filter((e) => e.type === 'decision');
    this.metrics.creativity = Math.min(100, 30 + decisionEvents.length * 10);

    // 结果评分：综合计算
    this.metrics.outcome = Math.min(
      100,
      (this.metrics.trust + this.metrics.alignment + this.metrics.creativity) / 3
    );

    // 连贯性：基于迭代次数（越多越难保持连贯）
    this.metrics.coherence = Math.max(20, 80 - this.currentIteration * 2);
  }

  /**
   * 保存模拟结果
   */
  private async saveSimulationResult(): Promise<void> {
    if (!this.debateId) return;

    try {
      const { error } = await supabaseAdmin
        .from('cotrials')
        .update({
          result: JSON.stringify({
            events: this.events,
            metrics: this.metrics,
            iterations: this.currentIteration,
          }),
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('debate_id', this.debateId);

      if (error) {
        console.error('保存模拟结果失败:', error);
      }
    } catch (error) {
      console.error('保存模拟结果异常:', error);
    }
  }
}

// =============================================================================
// 导出单例
// =============================================================================

let simulationEngineInstance: SimulationEngine | null = null;

/**
 * 获取 SimulationEngine 单例
 */
export function getSimulationEngine(): SimulationEngine {
  if (!simulationEngineInstance) {
    simulationEngineInstance = new SimulationEngine();
  }
  return simulationEngineInstance;
}

/**
 * 重置 SimulationEngine 单例
 */
export function resetSimulationEngine(): void {
  simulationEngineInstance = null;
}