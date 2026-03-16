/**
 * 知遇圆桌 - 核心类型定义
 * [POS]: types/ - 全应用共享的类型定义中心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================
// 用户系统
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;

  // SecondMe OAuth
  secondmeId: string | null;

  // 用户配置
  interests: string[];
  connectionTypes: ConnectionType[];
  allowAgentAutoJoin: boolean;

  // 关联
  agent?: Agent;

  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionType =
  | 'peer'        // 同道
  | 'cofounder'   // 共创搭子
  | 'opponent'    // 对手/互辩者
  | 'advisor'     // 顾问/评审
  | 'inspiration' // 灵感来源
  | 'none';       // 暂不建议

// ============================================
// AI 分身系统
// ============================================

export interface Agent {
  id: string;
  userId: string;

  // Agent 配置
  name: string;
  personality: string | null;
  expertise: string[];
  tone: string;

  // Agent 状态
  isActive: boolean;
  lastActive: Date | null;

  // 关联
  messages?: Message[];

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 议题系统
// ============================================

export interface Topic {
  id: string;

  // 议题信息
  title: string;
  description: string | null;
  category: TopicCategory;
  tags: string[];

  // 知乎关联
  zhihuId: string | null;
  zhihuUrl: string | null;

  // 状态
  status: 'active' | 'closed' | 'archived';

  // 关联
  rounds?: Round[];

  createdAt: Date;
  updatedAt: Date;
}

export type TopicCategory =
  | 'technology'   // 科技
  | 'business'       // 商业
  | 'culture'        // 文化
  | 'society'        // 社会
  | 'science'        // 科学
  | 'art'            // 艺术
  | 'lifestyle'      // 生活方式
  | 'other';         // 其他

// ============================================
// 圆桌讨论系统
// ============================================

export interface Round {
  id: string;

  // 关联
  topicId: string;
  topic?: Topic;

  // 圆桌配置
  name: string;
  description: string | null;
  maxAgents: number;

  // 状态
  status: 'waiting' | 'ongoing' | 'completed';

  // 结果
  summary: string | null;
  insights: any | null;

  // 关联
  participants?: RoundParticipant[];
  messages?: Message[];
  matches?: Match[];

  createdAt: Date;
  updatedAt: Date;
}

export interface RoundParticipant {
  id: string;
  roundId: string;
  round?: Round;
  userId: string;
  user?: User;

  // 参与信息
  role: 'host' | 'participant' | 'observer';
  joinedAt: Date;
  leftAt: Date | null;
}

export interface Message {
  id: string;
  roundId: string;
  round?: Round;
  agentId: string;
  agent?: Agent;

  // 消息内容
  content: string;
  type: 'text' | 'quote' | 'action';

  // 元数据
  metadata: any | null;

  // 上下文
  replyTo: string | null;

  createdAt: Date;
}

// ============================================
// 知遇卡系统 (伯乐层输出)
// ============================================

export interface Match {
  id: string;

  // 关联
  roundId: string;
  round?: Round;
  userAId: string;
  userA?: User;
  userBId: string;
  userB?: User;

  // 匹配数据
  complementarityScore: number; // 互补性评分
  futureGenerativityScore: number; // 未来生成性评分
  overallScore: number; // 综合评分

  // 关系分析
  relationshipType: ConnectionType;
  matchReason: string;
  complementarityAreas: string[];

  // 洞察
  insights: any;

  // 状态
  status: 'pending' | 'accepted' | 'declined' | 'completed';

  // 关联
  debate?: Debate;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 争鸣层系统
// ============================================

export interface Debate {
  id: string;

  // 关联
  matchId: string;
  match?: Match;

  // 争鸣配置
  scenario: 'cofounder' | 'partnership' | 'collaboration';

  // 问题与回答
  questions: DebateQuestion[];
  responses: DebateResponse[];

  // AI 分析结果
  analysis: DebateAnalysis | null;

  // 关系建议
  relationshipSuggestion: string | null;
  shouldConnect: boolean | null;
  riskAreas: string[];
  nextSteps: string[];

  // 状态
  status: 'waiting' | 'ongoing' | 'completed';

  // 关联
  cotrial?: Cotrial;

  createdAt: Date;
  updatedAt: Date;
}

export interface DebateQuestion {
  id: string;
  question: string;
  type: 'conflict_resolution' | 'risk_handling' | 'decision_making' | 'boundary_test';
  context: string;
}

export interface DebateResponse {
  questionId: string;
  userAResponse: string;
  userBResponse: string;
  timestamp: Date;
}

export interface DebateAnalysis {
  concessionAbility: number; // 让步能力
  boundaryAwareness: number; // 边界意识
  riskPreference: number; // 风险偏好
  decisionStyle: {
    userA: 'intuitive' | 'analytical' | 'collaborative' | 'directive';
    userB: 'intuitive' | 'analytical' | 'collaborative' | 'directive';
  };
  disagreementType: ('values' | 'methods' | 'goals' | 'risk_tolerance')[];
  healthScore: number; // 整体健康度
}

// ============================================
// 共试层系统
// ============================================

export interface Cotrial {
  id: string;

  // 关联
  debateId: string;
  debate?: Debate;

  // 共试任务
  taskType: 'co_write' | 'co_demo' | 'co_answer' | 'co_proposal' | 'co_collaboration';

  // 任务详情
  taskDescription: string;
  taskGoal: string;
  taskDuration: string;

  // 结果
  result: string | null;
  completed: boolean;
  completedAt: Date | null;

  // 反馈
  feedbackA: CotrialFeedback | null;
  feedbackB: CotrialFeedback | null;

  // 后续行动
  continued: boolean | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CotrialFeedback {
  satisfaction: number; // 1-5
  comment: string;
  wouldContinue: boolean;
}

// ============================================
// API 响应通用类型
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 错误代码定义
export enum ErrorCode {
  // 认证错误 1xxx
  UNAUTHORIZED = '1001',
  TOKEN_EXPIRED = '1002',
  INVALID_CREDENTIALS = '1003',

  // 资源错误 2xxx
  RESOURCE_NOT_FOUND = '2001',
  RESOURCE_CONFLICT = '2002',
  RESOURCE_LIMIT_EXCEEDED = '2003',

  // 业务错误 3xxx
  ROUND_FULL = '3001',
  ROUND_CLOSED = '3002',
  MATCH_EXPIRED = '3003',
  DEBATE_IN_PROGRESS = '3004',

  // 系统错误 4xxx
  INTERNAL_ERROR = '4001',
  SERVICE_UNAVAILABLE = '4002',
  TIMEOUT = '4003',
}
