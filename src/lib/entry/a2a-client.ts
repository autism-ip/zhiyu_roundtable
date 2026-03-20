/**
 * A2A 协议客户端
 * [INPUT]: 依赖 fetch API
 * [OUTPUT]: 对外提供 A2A 客户端管理
 * [POS]: lib/entry/a2a-client.ts - A2A 协议客户端封装
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================
// 类型定义
// ============================================

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  provider?: {
    organization: string;
    contactEmail?: string;
  };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    inputModes: string[];
    outputModes: string[];
  }>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: Array<{
    type: 'text' | 'image' | 'file';
    text?: string;
    mimeType?: string;
    data?: string;
  }>;
}

export interface A2AMessageRequest {
  messageId: string;
  message: A2AMessage;
  sessionId?: string;
}

export interface A2AMessageResponse {
  messageId: string;
  message: A2AMessage;
  status: 'completed' | 'in_progress' | 'failed';
  error?: string;
}

export interface A2AStreamEvent {
  type: 'message' | 'status' | 'error';
  message?: A2AMessage;
  status?: 'processing' | 'completed' | 'failed';
  error?: string;
}

// ============================================
// A2A Client Manager
// ============================================

export class A2AClientManager {
  private clients: Map<string, A2AClient> = new Map();
  private agentCards: Map<string, AgentCard> = new Map();

  /**
   * 获取 Agent 客户端
   */
  async getClient(agentUrl: string): Promise<A2AClient> {
    if (!this.clients.has(agentUrl)) {
      const client = new A2AClient(agentUrl);
      this.clients.set(agentUrl, client);
    }
    return this.clients.get(agentUrl)!;
  }

  /**
   * 获取 Agent Card
   */
  async getAgentCard(agentUrl: string): Promise<AgentCard | null> {
    if (this.agentCards.has(agentUrl)) {
      return this.agentCards.get(agentUrl)!;
    }

    try {
      const cardUrl = new URL('/.well-known/agent-card.json', agentUrl).toString();
      const response = await fetch(cardUrl);
      if (!response.ok) {
        return null;
      }
      const card = await response.json() as AgentCard;
      this.agentCards.set(agentUrl, card);
      return card;
    } catch {
      return null;
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(agentUrl: string, content: string, sessionId?: string): Promise<string> {
    const client = await this.getClient(agentUrl);
    const response = await client.sendMessage({
      messageId: crypto.randomUUID(),
      message: {
        role: 'user',
        parts: [{ type: 'text', text: content }],
      },
      sessionId,
    });
    return this.extractResponse(response);
  }

  /**
   * 流式发送消息
   */
  async *streamMessage(
    agentUrl: string,
    content: string,
    sessionId?: string
  ): AsyncGenerator<string> {
    const client = await this.getClient(agentUrl);
    const stream = client.sendMessageStreaming({
      messageId: crypto.randomUUID(),
      message: {
        role: 'user',
        parts: [{ type: 'text', text: content }],
      },
      sessionId,
    });

    for await (const event of stream) {
      if (event.type === 'message' && event.message?.parts) {
        yield event.message.parts.map(p => p.text || '').join('');
      }
    }
  }

  /**
   * 提取响应文本
   */
  private extractResponse(response: A2AMessageResponse): string {
    if (response.status === 'failed') {
      throw new Error(response.error || 'A2A request failed');
    }
    return response.message?.parts.map(p => p.text || '').join('') || '';
  }

  /**
   * 清除客户端缓存
   */
  clearCache(): void {
    this.clients.clear();
    this.agentCards.clear();
  }
}

// ============================================
// A2A Client
// ============================================

export class A2AClient {
  constructor(private agentUrl: string) {}

  /**
   * 发送消息
   */
  async sendMessage(request: A2AMessageRequest): Promise<A2AMessageResponse> {
    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return {
        messageId: request.messageId,
        message: { role: 'agent', parts: [] },
        status: 'failed',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return response.json();
  }

  /**
   * 流式发送消息
   */
  async *sendMessageStreaming(
    request: A2AMessageRequest
  ): AsyncGenerator<A2AStreamEvent> {
    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      yield {
        type: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data) as A2AStreamEvent;
              yield event;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 获取 Agent Card
   */
  async getAgentCard(): Promise<AgentCard | null> {
    try {
      const cardUrl = new URL('/.well-known/agent-card.json', this.agentUrl).toString();
      const response = await fetch(cardUrl);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }
}

// ============================================
// 单例导出
// ============================================

let instance: A2AClientManager | null = null;

export function getA2AClientManager(): A2AClientManager {
  if (!instance) {
    instance = new A2AClientManager();
  }
  return instance;
}

export function resetA2AClientManager(): void {
  instance = null;
}
