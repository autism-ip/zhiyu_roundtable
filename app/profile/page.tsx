/**
 * 用户资料页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供用户资料页面
 * [POS]: app/profile/page.tsx - 用户个人中心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
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

// 模拟用户数据
const mockUser = {
  id: "user-1",
  name: "张三",
  email: "zhangsan@example.com",
  avatar: null,
  bio: "专注于 AI 产品设计和团队协作，相信技术能让人与人之间的连接更高效。",
  expertise: ["AI产品", "产品设计", "用户增长"],
  interests: ["技术创业", "产品思维", "团队管理"],
  connectionTypes: ["cofounder", "peer"],
  stats: {
    totalRounds: 12,
    totalMatches: 8,
    successfulCotrials: 5,
    daysActive: 45,
  },
  agents: [
    {
      id: "agent-1",
      name: "AI 产品助手",
      personality: "理性分析，擅长产品逻辑",
      status: "active",
      roundsJoined: 8,
    },
    {
      id: "agent-2",
      name: "协作观察员",
      personality: "温和友善，善于发现他人优点",
      status: "active",
      roundsJoined: 4,
    },
  ],
  recentActivity: [
    {
      type: "round",
      title: "AI 与未来教育",
      action: "参与了圆桌讨论",
      time: "2天前",
    },
    {
      type: "match",
      title: "与李四的匹配",
      action: "生成了知遇卡",
      time: "3天前",
    },
    {
      type: "cotrial",
      title: "知乎回答共写",
      action: "完成了共试任务",
      time: "1周前",
    },
  ],
  createdAt: new Date("2024-02-15"),
};

// 动画变体
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

// 统计卡片组件
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

// Agent 卡片组件
function AgentCard({ agent }: { agent: typeof mockUser.agents[0] }) {
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
            <p className="text-xs text-amber-400/60">{agent.personality}</p>
          </div>
        </div>
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
          活跃中
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/60">
        <Users className="w-3 h-3" />
        <span>参与 {agent.roundsJoined} 个圆桌</span>
      </div>
    </motion.div>
  );
}

// 活动记录组件
function ActivityItem({ activity }: { activity: typeof mockUser.recentActivity[0] }) {
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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "activity">("overview");

  const user = mockUser;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="animate-pulse text-amber-400">加载中...</div>
      </div>
    );
  }

  if (!session) {
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
              <Link href="/api/auth/signin">立即登录</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-600 to-yellow-600 text-amber-50 text-3xl">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors">
                  <Edit className="w-4 h-4 text-amber-950" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-amber-50">
                  {user.name}
                </h1>
                <p className="text-amber-300/60 text-sm mb-2">{user.email}</p>
                <p className="text-amber-200/80 max-w-md">{user.bio}</p>
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
                  value={user.stats.totalRounds}
                  icon={FileText}
                  color="bg-amber-500/20"
                />
                <StatCard
                  label="获得匹配"
                  value={user.stats.totalMatches}
                  icon={Users}
                  color="bg-yellow-500/20"
                />
                <StatCard
                  label="完成共试"
                  value={user.stats.successfulCotrials}
                  icon={MessageSquare}
                  color="bg-orange-500/20"
                />
                <StatCard
                  label="活跃天数"
                  value={user.stats.daysActive}
                  icon={Calendar}
                  color="bg-amber-600/20"
                />
              </div>

              {/* 专业领域 */}
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
                      {user.expertise.map((exp) => (
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

              {/* 兴趣标签 */}
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
                      {user.interests.map((interest) => (
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

              {/* 最近活动 */}
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
                    {user.recentActivity.map((activity, index) => (
                      <ActivityItem key={index} activity={activity} />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
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
                {user.agents.map((agent) => (
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
                  {user.recentActivity.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
