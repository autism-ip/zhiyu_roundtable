/**
 * A2A 协议服务端
 * [INPUT]: 依赖 AgentModeService, RoundService, CardGenerator
 * [OUTPUT]: 提供 A2A JSON-RPC 端点
 * [POS]: app/api/a2a/route.ts - A2A Server 实现
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { strictRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getAgentModeService } from '@/lib/entry/agent-mode';
import { getA2AClientManager } from '@/lib/entry/a2a-client';

// ============================================
// 类型定义
// ============================================

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ============================================
// Agent Card
// ============================================

const AGENT_CARD = {
  name: '知遇圆桌 Agent',
  description: 'A2A 时代的高价值连接发现与验证系统',
  url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/a2a` : 'http://localhost:3000/api/a2a',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: true,
  },
  skills: [
    { id: 'round-discussion', name: '圆桌讨论' },
    { id: 'match-analysis', name: '知遇卡分析' },
    { id: 'debate-validation', name: '争鸣验证' },
    { id: 'cotrial-simulation', name: '共试模拟' },
  ],
};

// ============================================
// GET /api/a2a - 返回 Agent Card
// ============================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(AGENT_CARD);
}

// ============================================
// POST /api/a2a - 处理 A2A 请求
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: JSONRPCRequest;
  let requestId: string | number | null = null;

  try {
    // 先解析请求体以获取 id
    body = await request.json();
    requestId = body.id ?? null;
  } catch {
    // 解析失败 - 这是基础设施错误，id 只能是 null
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    } as JSONRPCResponse);
  }

  // 验证速率限制 (此时已有 requestId 可用于错误响应)
  const ip = getClientIp(request);
  const rateLimitResult = strictRateLimiter(ip);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Rate limit exceeded',
      },
    }, {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
    } as any);
  }

  // 验证认证 (使用 cookie-based session)
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('secondme_user');
  if (!userCookie) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Unauthorized: Authentication required',
      },
    } as JSONRPCResponse);
  }

  let currentUser;
  let userDbId;
  try {
    const parsedUser = JSON.parse(decodeURIComponent(userCookie.value));
    // 优先使用数据库 UUID
    userDbId = parsedUser.dbId;
    currentUser = {
      userId: userDbId || parsedUser.userId || parsedUser.id,
      secondmeId: parsedUser.userId ? String(parsedUser.userId) : undefined,
      ...parsedUser,
    };
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Invalid session',
      },
    } as JSONRPCResponse);
  }

  // 验证 JSONRPC 版本
  if (body.jsonrpc !== '2.0') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    } as JSONRPCResponse);
  }

  // 处理方法
  const { method, params, id } = body;

  switch (method) {
    case 'agent.analyzeRound':
      return handleAnalyzeRound(params, id);

    case 'agent.generateMatch':
      return handleGenerateMatch(params, id);

    case 'agent.startDebate':
      return handleStartDebate(params, id);

    case 'agent.getStatus':
      return handleGetStatus(params, id);

    case 'agent/send':
      return handleAgentSend(params, id);

    default:
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      } as JSONRPCResponse);
  }
}

// ============================================
// A2A 方法处理
// ============================================

async function handleAnalyzeRound(
  params: Record<string, unknown> | undefined,
  id: string | number
): Promise<NextResponse> {
  try {
    const { roundId, content } = params || {};

    if (!roundId && !content) {
      return errorResponse(id, -32602, 'Invalid params: roundId or content required');
    }

    // TODO: 调用 RoundService 分析圆桌
    const result = {
      success: true,
      analysis: {
        topics: [],
        participants: [],
        insights: [],
      },
      message: 'Round analysis completed',
    };

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    } as JSONRPCResponse);
  } catch (error) {
    return errorResponse(id, -32000, `Internal error: ${error}`);
  }
}

async function handleGenerateMatch(
  params: Record<string, unknown> | undefined,
  id: string | number
): Promise<NextResponse> {
  try {
    const { userAId, userBId, roundId } = params || {};

    if (!userAId || !userBId) {
      return errorResponse(id, -32602, 'Invalid params: userAId and userBId required');
    }

    // TODO: 调用 CardGenerator 生成知遇卡
    const result = {
      success: true,
      match: {
        id: crypto.randomUUID(),
        userAId,
        userBId,
        complementarityScore: 0,
        relationshipType: 'peer',
        matchReason: '',
      },
      message: 'Match analysis completed',
    };

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    } as JSONRPCResponse);
  } catch (error) {
    return errorResponse(id, -32000, `Internal error: ${error}`);
  }
}

async function handleStartDebate(
  params: Record<string, unknown> | undefined,
  id: string | number
): Promise<NextResponse> {
  try {
    const { matchId, scenario } = params || {};

    if (!matchId) {
      return errorResponse(id, -32602, 'Invalid params: matchId required');
    }

    // TODO: 调用 DebateEngine 启动争鸣
    const result = {
      success: true,
      debateId: crypto.randomUUID(),
      questions: [],
      message: 'Debate initiated',
    };

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    } as JSONRPCResponse);
  } catch (error) {
    return errorResponse(id, -32000, `Internal error: ${error}`);
  }
}

async function handleGetStatus(
  params: Record<string, unknown> | undefined,
  id: string | number
): Promise<NextResponse> {
  try {
    const agentModeService = getAgentModeService();
    const currentMode = agentModeService.getMode();

    const result = {
      success: true,
      mode: currentMode,
      agentCard: AGENT_CARD,
      capabilities: AGENT_CARD.capabilities,
    };

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    } as JSONRPCResponse);
  } catch (error) {
    return errorResponse(id, -32000, `Internal error: ${error}`);
  }
}

async function handleAgentSend(
  params: Record<string, unknown> | undefined,
  id: string | number
): Promise<NextResponse> {
  try {
    const { targetAgentUrl, content, sessionId } = params || {};

    if (!targetAgentUrl || !content) {
      return errorResponse(id, -32602, 'Invalid params: targetAgentUrl and content required');
    }

    // 使用 A2AClientManager 发送消息给其他 Agent
    const clientManager = getA2AClientManager();
    const response = await clientManager.sendMessage(
      targetAgentUrl as string,
      content as string,
      sessionId as string | undefined
    );

    const result = {
      success: true,
      response,
    };

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    } as JSONRPCResponse);
  } catch (error) {
    return errorResponse(id, -32000, `Internal error: ${error}`);
  }
}

// ============================================
// 辅助函数
// ============================================

function errorResponse(
  id: string | number,
  code: number,
  message: string
): NextResponse {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  } as JSONRPCResponse);
}
