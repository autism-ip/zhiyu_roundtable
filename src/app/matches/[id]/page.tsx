/**
 * 知遇卡详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react, @/lib/match/match-service
 * [OUTPUT]: 对外提供知遇卡详情页面
 * [POS]: app/matches/[id]/page.tsx - 知遇卡详情页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
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

// ============================================
// 类型定义
// ============================================

interface MatchUser {
  id: string;
  name: string;
  avatar: string | null;
  expertise: string[];
  interests?: string[];
}

interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a: MatchUser;
  user_b: MatchUser;
  complementarity_score: number;
  future_generativity_score: number;
  overall_score: number;
  relationship_type: string;
  match_reason: string;
  complementarity_areas: string[];
  insights: string[];
  status: "pending" | "accepted" | "declined";
  created_at: string;
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
// 关系类型映射
// ============================================

const relationshipLabels: Record<string, string> = {
  cofounder: "共创搭子",
  peer: "同道",
  opponent: "对手",
  advisor: "顾问",
  none: "暂不建议",
};

// ============================================
// 动画变体
// ============================================

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

// ============================================
// 评分条组件
// ============================================

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

// ============================================
// 用户卡片组件
// ============================================

function UserCard({
  user,
  isCurrentUser,
  label,
}: {
  user: MatchUser;
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

// ============================================
// AI 洞察卡片
// ============================================

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

// ============================================
// 加载状态组件
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <div className="animate-pulse text-orange-400">加载中...</div>
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0908] to-[#0a0908]" />
      </div>
      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/10 mb-6">
            <Heart className="w-10 h-10 text-orange-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-orange-50 mb-4">
            出错了
          </h1>
          <p className="text-orange-300/60 mb-8">{message}</p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-0"
          >
            <Link href="/matches">返回知遇卡</Link>
          </Button>
        </div>
      </div>
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
            <Link href="/login">立即登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主页面组件
// ============================================

export default function MatchDetailPage() {
  const { user, isLoading: isSessionLoading } = useSecondMeSession();
  const params = useParams();
  const router = useRouter();

  // 状态管理
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const matchId = params.id as string;

  // 获取知遇卡详情
  useEffect(() => {
    async function fetchMatch() {
      if (!matchId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/matches/${matchId}`);
        const result: ApiResponse<Match> = await response.json();

        if (result.success && result.data) {
          setMatch(result.data);
        } else {
          setError(result.error?.message || "获取知遇卡详情失败");
        }
      } catch (err) {
        setError("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    }

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  // 处理接受 - 发起争鸣
  const handleAccept = async () => {
    if (!match || !user) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/matches/${matchId}/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result: ApiResponse<{ id: string }> = await response.json();

      if (result.success && result.data) {
        router.push(`/debates/${result.data.id}`);
      } else {
        setError(result.error?.message || "发起争鸣失败");
        setIsProcessing(false);
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      setIsProcessing(false);
    }
  };

  // 处理婉拒
  const handleDecline = async () => {
    if (!match || !user) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/matches/${matchId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
        }),
      });

      const result: ApiResponse<Match> = await response.json();

      if (result.success) {
        router.push("/matches");
      } else {
        setError(result.error?.message || "拒绝匹配失败");
        setIsProcessing(false);
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      setIsProcessing(false);
    }
  };

  // 加载状态
  if (isSessionLoading || isLoading) {
    return <LoadingState />;
  }

  // 未登录状态
  if (!user) {
    return <UnauthenticatedState />;
  }

  // 错误状态
  if (error && !match) {
    return <ErrorState message={error} />;
  }

  // 无数据状态
  if (!match) {
    return <ErrorState message="知遇卡不存在" />;
  }

  // 获取当前用户ID用于判断
  const currentUserId = user.userId;
  const isUserA = match.user_a_id === currentUserId;
  const isUserB = match.user_b_id === currentUserId;

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
                发现与 {isUserA ? match.user_b.name : match.user_a.name} 的连接
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
            <UserCard
              user={isUserA ? match.user_a : match.user_b}
              isCurrentUser
              label="你"
            />
            <motion.div variants={itemVariants} className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-orange-500 text-white border-0">
                    {relationshipLabels[match.relationship_type] || match.relationship_type}
                  </Badge>
                </div>
              </div>
            </motion.div>
            <UserCard
              user={isUserA ? match.user_b : match.user_a}
            />
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
                  {match.match_reason}
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
                  value={match.complementarity_score}
                  icon={Users}
                  color="bg-orange-500"
                />
                <ScoreBar
                  label="未来生成性"
                  value={match.future_generativity_score}
                  icon={TrendingUp}
                  color="bg-red-500"
                />
                <ScoreBar
                  label="综合评分"
                  value={match.overall_score}
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
                  {match.complementarity_areas.map((area) => (
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
