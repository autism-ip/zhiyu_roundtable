/**
 * 争鸣结果页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供争鸣结果展示页面
 * [POS]: app/debates/[id]/result/page.tsx - 争鸣结果页
 * [PROTOCOL]: 变更时更新此头部
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Zap,
  Target,
  Shield,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface DebateResult {
  id: string;
  match_id: string;
  status: "waiting" | "ongoing" | "completed";
  relationship_suggestion: string;
  should_connect: boolean;
  risk_areas: string[];
  next_steps: string[];
  analysis: {
    alignment: number;
    conflict_potential: number;
    collaboration_score: number;
  };
  match?: {
    user_a: { id: string; name: string; avatar: string | null };
    user_b: { id: string; name: string; avatar: string | null };
  };
}

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
    transition: { staggerChildren: 0.1 },
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
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-lg font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// 风险卡片组件
// ============================================

function RiskCard({ risk }: { risk: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/30"
    >
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-red-200">{risk}</p>
    </motion.div>
  );
}

// ============================================
// 步骤卡片组件
// ============================================

function StepCard({ step, index }: { step: string; index: number }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30"
    >
      <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-emerald-400 text-sm font-bold">{index + 1}</span>
      </div>
      <p className="text-emerald-200">{step}</p>
    </motion.div>
  );
}

// ============================================
// 用户卡片组件
// ============================================

function UserCard({
  user,
  isCurrentUser,
}: {
  user: { id: string; name: string; avatar: string | null };
  isCurrentUser?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700/50"
    >
      {isCurrentUser && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            你
          </Badge>
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 border-4 border-slate-600/50 mb-4">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback className="bg-slate-700 text-slate-200 text-xl">
            {user.name[0]}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
      </div>
    </motion.div>
  );
}

// ============================================
// 加载状态组件
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <div className="flex items-center gap-3 text-amber-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>加载中...</span>
      </div>
    </div>
  );
}

// ============================================
// 错误状态组件
// ============================================

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-amber-50 mb-4">{message}</h2>
        <Link
          href="/matches"
          className="text-amber-400 hover:text-amber-300 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回知遇卡
        </Link>
      </div>
    </div>
  );
}

// ============================================
// 主页面组件
// ============================================

export default function DebateResultPage() {
  const { user } = useSecondMeSession();
  const params = useParams();
  const router = useRouter();

  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debateId = params.id as string;

  // 获取争鸣结果
  useEffect(() => {
    async function fetchDebateResult() {
      if (!debateId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/debates/${debateId}`);
        const result: ApiResponse<DebateResult> = await response.json();

        if (result.success && result.data) {
          setDebate(result.data);
        } else {
          setError(result.error?.message || "获取争鸣结果失败");
        }
      } catch (err) {
        setError("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    }

    if (debateId) {
      fetchDebateResult();
    }
  }, [debateId]);

  // 加载状态
  if (isLoading) {
    return <LoadingState />;
  }

  // 错误状态
  if (error || !debate) {
    return <ErrorState message={error || "争鸣结果不存在"} />;
  }

  // 获取当前用户
  const currentUserId = user?.userId;
  const isUserA = debate.match?.user_a?.id === currentUserId;
  const otherUser = isUserA ? debate.match?.user_b : debate.match?.user_a;

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950/50 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
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
            href={`/debates/${debateId}`}
            className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回争鸣层
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-amber-50">
                争鸣结果
              </h1>
              <p className="text-amber-300/60 text-sm">
                合作关系验证分析报告
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
          {/* 关系建议 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  关系类型建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12 text-amber-400" />
                    </div>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        debate.should_connect
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {debate.should_connect ? "建议连接" : "暂不建议"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-amber-100 mb-2">
                      {relationshipLabels[debate.relationship_suggestion] ||
                        debate.relationship_suggestion}
                    </div>
                    <p className="text-slate-400">关系类型</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 配对双方 */}
          <motion.div variants={itemVariants}>
            <div className="grid md:grid-cols-2 gap-6">
              {debate.match?.user_a && (
                <UserCard
                  user={debate.match.user_a}
                  isCurrentUser={isUserA}
                />
              )}
              {debate.match?.user_b && (
                <UserCard
                  user={debate.match.user_b}
                  isCurrentUser={!isUserA}
                />
              )}
            </div>
          </motion.div>

          {/* 分析指标 */}
          {debate.analysis && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    合作分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ScoreBar
                    label="一致性"
                    value={debate.analysis.alignment}
                    color="bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                  <ScoreBar
                    label="冲突潜力"
                    value={debate.analysis.conflict_potential}
                    color="bg-gradient-to-r from-red-500 to-orange-500"
                  />
                  <ScoreBar
                    label="协作评分"
                    value={debate.analysis.collaboration_score}
                    color="bg-gradient-to-r from-amber-500 to-yellow-500"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 风险领域 */}
          {debate.risk_areas && debate.risk_areas.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-red-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    风险领域
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {debate.risk_areas.map((risk, index) => (
                    <RiskCard key={index} risk={risk} />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 下一步行动 */}
          {debate.next_steps && debate.next_steps.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-emerald-100 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                    下一步行动
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {debate.next_steps.map((step, index) => (
                    <StepCard key={index} step={step} index={index} />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 操作按钮 */}
          <motion.div variants={itemVariants} className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="border-slate-600 text-slate-300 hover:bg-slate-800/50"
            >
              <Link href="/matches">返回知遇卡</Link>
            </Button>
            {debate.should_connect && (
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0"
              >
                <Link href={`/cotrials/create?matchId=${debate.match_id}`}>
                  进入共试层
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
