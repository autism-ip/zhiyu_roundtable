/**
 * 用户资料页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供用户资料页面
 * [POS]: app/profile/page.tsx - 用户个人中心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Settings,
  MessageSquare,
  FileText,
  Users,
  Sparkles,
  TrendingUp,
  Calendar,
  Edit,
  Plus,
  ArrowRight,
  Shield,
  Bot,
  Clock,
  Zap,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface UserStats {
  total_rounds: number;
  total_matches: number;
  successful_cotrials: number;
  days_active: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio?: string;
  expertise: string[];
  interests: string[];
  connection_types?: string[];
  stats: UserStats;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  personality?: string;
  is_active: boolean;
  rounds_joined: number;
}

interface RecentActivity {
  type: "round" | "match" | "cotrial";
  title: string;
  action: string;
  time: string;
}

// ============================================
// API 响应类型
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// 动画变体
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// 统计卡片组件
// ============================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border border-amber-500/30"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-100">{value}</p>
          <p className="text-sm text-amber-400/70">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Agent 卡片组件
// ============================================

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded-xl bg-gradient-to-br from-amber-900/30 to-yellow-900/10 border border-amber-500/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <h4 className="font-medium text-amber-100">{agent.name}</h4>
            <p className="text-xs text-amber-400/60">{agent.personality || "暂无描述"}</p>
          </div>
        </div>
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
          {agent.is_active ? "活跃中" : "未激活"}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/60">
        <Users className="w-3 h-3" />
        <span>参与 {agent.rounds_joined} 个圆桌</span>
      </div>
    </motion.div>
  );
}

// ============================================
// 活动记录组件
// ============================================

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const iconMap = {
    round: FileText,
    match: Users,
    cotrial: MessageSquare,
  };
  const Icon = iconMap[activity.type as keyof typeof iconMap] || FileText;

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-900/10 transition-colors"
    >
      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-100 truncate">{activity.title}</p>
        <p className="text-xs text-amber-400/60">{activity.action}</p>
      </div>
      <span className="text-xs text-amber-500/50">{activity.time}</span>
    </motion.div>
  );
}

// ============================================
// 加载状态组件
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <div className="animate-pulse text-amber-400">加载中...</div>
    </div>
  );
}

// ============================================
// 未登录状态组件
// ============================================

function UnauthenticatedState() {
  return (
    <div className="min-h-screen bg-[#0a0908]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
            <User className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-amber-50 mb-4">
            个人中心
          </h1>
          <p className="text-amber-300/60 mb-8">
            登录后查看您的个人资料和参与记录
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-0"
          >
            <Link href="/login">立即登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 错误状态组件
// ============================================

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a0908]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
            <User className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-amber-50 mb-4">
            出错了
          </h1>
          <p className="text-amber-300/60 mb-8">{message}</p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-0"
          >
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UUID 格式验证
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ============================================
// 主页面组件
// ============================================

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useSecondMeSession();
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "activity">("overview");

  // 状态管理
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取用户数据
  useEffect(() => {
    async function fetchUserData() {
      if (!authUser?.userId) return;

      setIsLoading(true);
      setError(null);

      try {
        // 解析实际的数据库 UUID（兼容 SecondMe numeric ID）
        let actualUserId = authUser.userId;

        // 如果 userId 不是有效的 UUID 格式，尝试通过 secondmeId 查询
        if (!isValidUUID(actualUserId) && authUser.secondmeId) {
          try {
            const lookupResponse = await fetch(`/api/users/lookup?secondmeId=${encodeURIComponent(authUser.secondmeId)}`);
            const lookupResult = await lookupResponse.json();
            if (lookupResult.success && lookupResult.data?.id) {
              actualUserId = lookupResult.data.id;
            }
          } catch (e) {
            console.error('查询用户UUID失败:', e);
            // 如果查询失败，保留原始 userId 尝试（可能数据库中还没创建用户）
          }
        }

        // 获取用户信息
        const userResponse = await fetch(`/api/users/${actualUserId}`);
        const userResult: ApiResponse<UserProfile> = await userResponse.json();

        if (userResult.success && userResult.data) {
          setUser(userResult.data);

          // 获取 Agents 列表
          const agentsResponse = await fetch(`/api/agents?userId=${actualUserId}`);
          const agentsResult: ApiResponse<Agent[]> = await agentsResponse.json();

          if (agentsResult.success && agentsResult.data) {
            setAgents(agentsResult.data);
          }

          // 获取最近活动
          const timelineResponse = await fetch(`/api/timeline?limit=10`);
          const timelineResult: ApiResponse<any[]> = await timelineResponse.json();

          if (timelineResult.success && timelineResult.data) {
            const formattedActivity: RecentActivity[] = timelineResult.data.map((event) => {
              // 从 event_type 提取 action (如 "round.joined" -> "加入了圆桌")
              const eventTypeParts = event.event_type?.split('.') || [];
              const actionMap: Record<string, string> = {
                joined: "加入了",
                created: "创建了",
                left: "离开了",
                completed: "完成了",
                generated: "生成了",
                accepted: "接受了",
                declined: "拒绝了",
                initiated: "发起了",
                responded: "回答了",
                rated: "评价了",
              };
              const actionVerb = eventTypeParts.length > 1 ? actionMap[eventTypeParts[1]] || eventTypeParts[1] : event.event_type;

              // 从 aggregate_type 确定 type
              const typeMap: Record<string, "round" | "match" | "cotrial"> = {
                round: "round",
                match: "match",
                cotrial: "cotrial",
              };
              const type = typeMap[event.aggregate_type] || "round";

              // 从 metadata 提取 title
              let title = "";
              if (event.metadata) {
                title = event.metadata.round_name || event.metadata.match_reason || event.metadata.task_description || event.aggregate_id;
              } else {
                title = event.aggregate_id;
              }

              // 格式化时间
              const time = event.created_at
                ? new Date(event.created_at).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return {
                type,
                title,
                action: actionVerb,
                time,
              };
            });
            setRecentActivity(formattedActivity);
          }
        } else {
          setError(userResult.error?.message || "获取用户信息失败");
        }
      } catch (err) {
        setError("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    }

    if (authUser?.userId) {
      fetchUserData();
    }
  }, [authUser?.userId]);

  // 加载状态
  if (authLoading || isLoading) {
    return <LoadingState />;
  }

  // 未登录状态
  if (!authUser) {
    return <UnauthenticatedState />;
  }

  // 错误状态
  if (error && !user) {
    return <ErrorState message={error} />;
  }

  // 默认用户数据（防止渲染崩溃）
  const displayUser = user || {
    id: authUser.userId,
    name: authUser.name || "未设置名称",
    email: authUser.email || "",
    avatar: authUser.avatar,
    expertise: [],
    interests: [],
    stats: {
      total_rounds: 0,
      total_matches: 0,
      successful_cotrials: 0,
      days_active: 0,
    },
    created_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
        {/* 温暖光晕效果 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-5xl">
        {/* 头部信息 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-amber-500/30">
                  <AvatarImage src={displayUser.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-600 to-yellow-600 text-amber-50 text-3xl">
                    {displayUser.name[0]}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors">
                  <Edit className="w-4 h-4 text-amber-950" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-amber-50">
                  {displayUser.name}
                </h1>
                <p className="text-amber-300/60 text-sm mb-2">{displayUser.email}</p>
                {displayUser.bio && (
                  <p className="text-amber-200/80 max-w-md">{displayUser.bio}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-300 hover:bg-amber-900/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
          </div>
        </motion.div>

        {/* 标签页切换 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2 mb-6 border-b border-amber-500/20 pb-4"
        >
          {[
            { key: "overview", label: "概览", icon: TrendingUp },
            { key: "agents", label: "我的 Agent", icon: Bot },
            { key: "activity", label: "参与记录", icon: Clock },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-amber-400/60 hover:text-amber-300 hover:bg-amber-900/10"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {activeTab === "overview" && (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="参与圆桌"
                  value={displayUser.stats.total_rounds}
                  icon={FileText}
                  color="bg-amber-500/20"
                />
                <StatCard
                  label="获得匹配"
                  value={displayUser.stats.total_matches}
                  icon={Users}
                  color="bg-yellow-500/20"
                />
                <StatCard
                  label="完成共试"
                  value={displayUser.stats.successful_cotrials}
                  icon={MessageSquare}
                  color="bg-orange-500/20"
                />
                <StatCard
                  label="活跃天数"
                  value={displayUser.stats.days_active}
                  icon={Calendar}
                  color="bg-amber-600/20"
                />
              </div>

              {/* 专业领域 */}
              {displayUser.expertise.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8">
                  <Card className="bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="text-amber-100 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        专业领域
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {displayUser.expertise.map((exp) => (
                          <span
                            key={exp}
                            className="px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 兴趣标签 */}
              {displayUser.interests.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8">
                  <Card className="bg-amber-900/20 border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="text-amber-100 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        感兴趣的方向
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {displayUser.interests.map((interest) => (
                          <span
                            key={interest}
                            className="px-3 py-1 rounded-full bg-slate-800 text-slate-300"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 最近活动 */}
              {recentActivity.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="bg-amber-900/20 border-amber-500/30">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-amber-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        最近活动
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-amber-400/60 hover:text-amber-300">
                        查看全部
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {recentActivity.map((activity, index) => (
                        <ActivityItem key={index} activity={activity} />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {activeTab === "agents" && (
            <>
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-amber-100">我的 Agent</h3>
                    <p className="text-amber-400/60 text-sm">管理你的 AI 分身</p>
                  </div>
                  <Button className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    创建新 Agent
                  </Button>
                </div>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}

                {/* 添加新 Agent 卡片 */}
                <motion.div
                  variants={itemVariants}
                  className="p-4 rounded-xl border-2 border-dashed border-amber-500/30 flex flex-col items-center justify-center min-h-[140px] cursor-pointer hover:border-amber-400/50 hover:bg-amber-900/10 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-amber-400" />
                  </div>
                  <p className="text-amber-300/60 text-sm">创建新 Agent</p>
                </motion.div>
              </div>
            </>
          )}

          {activeTab === "activity" && (
            <motion.div variants={itemVariants}>
              <Card className="bg-amber-900/20 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    全部活动记录
                  </CardTitle>
                  <CardDescription className="text-amber-400/60">
                    你所有的参与历史
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <ActivityItem key={index} activity={activity} />
                    ))
                  ) : (
                    <p className="text-amber-400/60 text-center py-8">
                      暂无活动记录
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
