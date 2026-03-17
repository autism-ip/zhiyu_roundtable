/**
 * [INPUT]: 依赖 openai SDK
 * [OUTPUT]: 对外提供 Minimax AI 客户端封装
 * [POS]: lib/ai/minimax-client.ts - AI 能力底层支撑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import OpenAI from 'openai';

// ============================================
// 配置
// ============================================

export interface MinimaxConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: Partial<MinimaxConfig> = {
  baseUrl: 'https://api.minimax.chat/v1',
  model: 'abab6.5s-chat',
  maxTokens: 4096,
  temperature: 0.7,
};

// ============================================
// 客户端类
// ============================================

export class MinimaxClient {
  private client: OpenAI;
  private config: MinimaxConfig;

  constructor(config: MinimaxConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error('Minimax API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  /**
   * 聊天补全
   */
  async chatCompletion(
    messages: any[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
    }
  ): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.config.model!,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      tools: options?.tools,
    });

    return response;
  }

  /**
   * 简化版聊天接口
   */
  async chat(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chatCompletion(messages, options);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * JSON 结构化输出
   */
  async chatJSON<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<T> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt + '\n\n请以 JSON 格式输出。' },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chatCompletion(messages, {
      ...options,
      temperature: options?.temperature ?? 0.3, // 低温度保证稳定性
    });

    const content = response.choices[0]?.message?.content || '{}';

    try {
      return JSON.parse(content) as T;
    } catch {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error(`Failed to parse JSON from response: ${content}`);
    }
  }
}

// ============================================
// 单例导出
// ============================================

let instance: MinimaxClient | null = null;

/**
 * 获取 Minimax 客户端实例
 */
export function getMinimaxClient(config?: Partial<MinimaxConfig>): MinimaxClient {
  if (!instance) {
    const apiKey = config?.apiKey || process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY environment variable is not set');
    }
    instance = new MinimaxClient({ apiKey, ...config });
  }
  return instance;
}

/**
 * 重置客户端实例（用于测试或配置更改）
 */
export function resetMinimaxClient(): void {
  instance = null;
}
