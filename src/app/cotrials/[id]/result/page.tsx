/**
 * 共试结果页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供共试结果展示页面
 * [POS]: app/cotrials/[id]/result/page.tsx - 共试结果页
 * [PROTOCOL]: 变更时更新此头部
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface CotrialResult {
  id: string;
  debate_id: string;
  task_type: string;
  task_description: string;
  task_goal: string;
  result: string;
  completed: boolean;
  completed_at: string | null;
  feedback_a?: {
    rating: number;
    comment: string;
  };
  feedback_b?: {
    rating: number;
    comment: string;
  };
  continued: boolean | null;
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
// 任务类型映射
// ============================================

const taskTypeLabels: Record<string, string> = {
  "collaborative-writing": "协作写作",
  "brainstorming": "头脑风暴",
  "code-review": "代码审查",
  "project-planning": "项目规划",
  "other": "其他任务",
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
// 星星评分组件
// ============================================

function StarRating({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: maxRating }).map((_, index) => (
        <span
          key={index}
          className={`text-lg ${
            index < rating ? "text-amber-400" : "text-slate-600"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ============================================
// 反馈卡片组件
// ============================================

function FeedbackCard({
  feedback,
  label,
}: {
  feedback: { rating: number; comment: string };
  label: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700/50"
    >
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
          {label}
        </Badge>
      </div>
      <StarRating rating={feedback.rating} />
      <p className="mt-4 text-slate-300 leading-relaxed">{feedback.comment}</p>
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

export default function CotrialResultPage() {
  const { user } = useSecondMeSession();
  const params = useParams();

  const [cotrial, setCotrial] = useState<CotrialResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cotrialId = params.id as string;

  // 获取共试结果
  useEffect(() => {
    async function fetchCotrialResult() {
      if (!cotrialId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cotrials/${cotrialId}`);
        const result: ApiResponse<CotrialResult> = await response.json();

        if (result.success && result.data) {
          setCotrial(result.data);
        } else {
          setError(result.error?.message || "获取共试结果失败");
        }
      } catch (err) {
        setError("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    }

    if (cotrialId) {
      fetchCotrialResult();
    }
  }, [cotrialId]);

  // 加载状态
  if (isLoading) {
    return <LoadingState />;
  }

  // 错误状态
  if (error || !cotrial) {
    return <ErrorState message={error || "共试结果不存在"} />;
  }

  // 获取当前用户ID判断反馈归属
  const currentUserId = user?.userId;

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0908] to-[#0a0908]" />
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
            href={`/cotrials/${cotrialId}`}
            className="inline-flex items-center gap-2 text-orange-400/70 hover:text-orange-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回共试层
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              {cotrial.completed ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-orange-50">
                共试结果
              </h1>
              <p className="text-orange-300/60 text-sm">
                合作关系落地验证报告
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
          {/* 完成状态 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  {cotrial.completed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  任务{cotrial.completed ? "已完成" : "未完成"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">任务类型</p>
                    <p className="text-lg text-orange-100">
                      {taskTypeLabels[cotrial.task_type] || cotrial.task_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">完成时间</p>
                    <p className="text-lg text-orange-100 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {cotrial.completed_at
                        ? new Date(cotrial.completed_at).toLocaleDateString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 任务描述 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-orange-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  任务详情
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">任务描述</p>
                  <p className="text-orange-200">{cotrial.task_description}</p>
                </div>
                {cotrial.task_goal && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">任务目标</p>
                    <p className="text-orange-200">{cotrial.task_goal}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 任务结果 */}
          {cotrial.result && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border-emerald-500/30">
                <CardHeader>
                  <CardTitle className="text-emerald-100">
                    任务成果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-emerald-200 leading-relaxed">
                    {cotrial.result}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 双方反馈 */}
          {(cotrial.feedback_a || cotrial.feedback_b) && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-orange-100">合作反馈</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {cotrial.feedback_a && (
                      <FeedbackCard feedback={cotrial.feedback_a} label="你的反馈" />
                    )}
                    {cotrial.feedback_b && (
                      <FeedbackCard feedback={cotrial.feedback_b} label="对方反馈" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 是否继续合作 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4">
                  {cotrial.continued ? (
                    <>
                      <ThumbsUp className="w-8 h-8 text-emerald-400" />
                      <span className="text-xl text-emerald-100 font-medium">
                        双方选择继续合作
                      </span>
                    </>
                  ) : cotrial.continued === false ? (
                    <>
                      <ThumbsDown className="w-8 h-8 text-red-400" />
                      <span className="text-xl text-red-100 font-medium">
                        暂不继续合作
                      </span>
                    </>
                  ) : (
                    <span className="text-xl text-slate-400 font-medium">
                      等待双方选择
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

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
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-0"
            >
              <Link href="/rounds">
                开启新圆桌
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
