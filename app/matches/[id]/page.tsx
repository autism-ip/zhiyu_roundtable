/**
 * 知遇卡详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供知遇卡详情页面
 * [POS]: app/matches/[id]/page.tsx - 知遇卡详情页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Heart,
  Flame,
  Sparkles,
  Users,
  TrendingUp,
  Check,
  X,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";

// 模拟数据
const mockMatch = {
  id: "match-1",
  userA: {
    id: "user-1",
    name: "张三",
    avatar: null,
    expertise: ["AI", "产品"],
    interests: ["技术创业", "产品设计"],
  },
  userB: {
    id: "user-2",
    name: "李四",
    avatar: null,
    expertise: ["后端", "架构"],
    interests: ["分布式系统", "性能优化"],
  },
  complementarityScore: 85,
  futureGenerativityScore: 78,
  overallScore: 82,
  relationshipType: "cofounder",
  matchReason: "在AI产品设计方面有很强的互补性，一个擅长从0到1的产品构思，另一个擅长技术架构落地",
  complementarityAreas: ["AI产品思维", "系统架构", "从0到1"],
  insights: [
    "你们在AI应用层有很强的协同效应",
    "一个偏商业化思维，一个偏技术实现",
    "组合后可以覆盖产品开发全流程",
  ],
  status: "pending" as const,
  createdAt: new Date("2024-03-10"),
};

// 关系类型映射
const relationshipLabels: Record<string, string> = {
  cofounder: "共创搭子",
  peer: "同道",
  opponent: "对手",
  advisor: "顾问",
  none: "暂不建议",
};

// 动画变体
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 评分条组件
function ScoreBar({
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-orange-200/70 flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className="text-lg font-bold text-orange-100">{value}</span>
      </div>
      <Progress value={value} className={`h-3 ${color}`} />
    </div>
  );
}

// 用户卡片组件
function UserCard({
  user,
  isCurrentUser,
  label,
}: {
  user: typeof mockMatch.userA;
  isCurrentUser?: boolean;
  label?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative p-6 rounded-2xl bg-gradient-to-br from-orange-900/40 to-red-900/20 border border-orange-500/30"
    >
      {label && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
            {label}
          </Badge>
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <Avatar className="h-24 w-24 border-4 border-orange-500/30">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-orange-900/50 text-orange-200 text-2xl">
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          {isCurrentUser && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">你</span>
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold text-orange-100 mb-1">{user.name}</h3>

        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {user.expertise.map((exp) => (
            <span
              key={exp}
              className="px-3 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/20"
            >
              {exp}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {user.interests?.map((interest) => (
            <span
              key={interest}
              className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// AI 洞察卡片
function InsightCard({ insight, index }: { insight: string; index: number }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-4 rounded-xl bg-orange-900/20 border border-orange-500/20"
    >
      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-orange-400" />
      </div>
      <p className="text-orange-200/80 text-sm leading-relaxed">{insight}</p>
    </motion.div>
  );
}

export default function MatchDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const matchId = params.id as string;
  const match = mockMatch;

  // 处理接受
  const handleAccept = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push(`/debates/${matchId}`);
  };

  // 处理婉拒
  const handleDecline = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/matches");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="animate-pulse text-orange-400">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0908] to-[#0a0908]" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/10 mb-6">
              <Heart className="w-10 h-10 text-orange-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-orange-50 mb-4">
              知遇卡详情
            </h1>
            <p className="text-orange-300/60 mb-8">
              登录后查看知遇卡详情
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-0"
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
        {/* 动态光晕 */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-4xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-orange-400/70 hover:text-orange-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回知遇卡
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-orange-50">
                知遇卡详情
              </h1>
              <p className="text-orange-300/60 text-sm">
                发现与 {match.userB.name} 的连接
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 配对双方 */}
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <UserCard user={match.userA} isCurrentUser />
            <motion.div variants={itemVariants} className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-orange-500 text-white border-0">
                    {relationshipLabels[match.relationshipType]}
                  </Badge>
                </div>
              </div>
            </motion.div>
            <UserCard user={match.userB} />
          </div>

          {/* 匹配原因 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-orange-900/20 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  匹配原因
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-200/80 leading-relaxed">
                  {match.matchReason}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* 评分 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-orange-900/20 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  匹配分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScoreBar
                  label="互补性"
                  value={match.complementarityScore}
                  icon={Users}
                  color="bg-orange-500"
                />
                <ScoreBar
                  label="未来生成性"
                  value={match.futureGenerativityScore}
                  icon={TrendingUp}
                  color="bg-red-500"
                />
                <ScoreBar
                  label="综合评分"
                  value={match.overallScore}
                  icon={Flame}
                  color="bg-gradient-to-r from-orange-500 to-red-500"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* 互补领域 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-orange-900/20 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-orange-400" />
                  互补领域
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {match.complementarityAreas.map((area) => (
                    <span
                      key={area}
                      className="px-4 py-2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI 洞察 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-orange-900/20 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  AI 洞察
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {match.insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} index={index} />
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-4 pt-4"
          >
            {match.status === "pending" ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="border-orange-500/30 text-orange-300 hover:bg-orange-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  婉拒
                </Button>
                <Button
                  size="lg"
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-0"
                >
                  {isProcessing ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      接受邀请
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-0"
              >
                <Link href={`/debates/${matchId}`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  进入争鸣层
                </Link>
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
