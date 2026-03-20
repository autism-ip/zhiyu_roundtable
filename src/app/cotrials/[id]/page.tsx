/**
 * 共试层详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供共试层详情页面
 * [POS]: app/cotrials/[id]/page.tsx - 共试层详情页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Rocket,
  Star,
  Sparkles,
  Users,
  Clock,
  Target,
  Check,
  X,
  Send,
  Gift,
  Zap,
  Calendar,
  Loader2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// =============================================================================
// 类型定义
// =============================================================================

interface CotrialUser {
  id: string;
  name: string;
  avatar: string | null;
  response?: string;
}

interface Cotrial {
  id: string;
  debate_id: string;
  task_type: string;
  task_description: string;
  task_goal: string;
  task_duration: string;
  result: string | null;
  completed: boolean;
  completed_at: string | null;
  feedback_a: any;
  feedback_b: any;
  continued: boolean | null;
  created_at: string;
  updated_at: string;
  debate?: {
    match?: {
      user_a_id: string;
      user_b_id: string;
    };
  };
}

interface ApiResponse {
  success: boolean;
  data?: Cotrial;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 常量
// =============================================================================

// 任务类型映射
const taskTypeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  co_write: { label: "共写内容", color: "bg-violet-500/20 text-violet-400", icon: Gift },
  co_demo: { label: "共做演示", color: "bg-blue-500/20 text-blue-400", icon: Zap },
  co_answer: { label: "共答问题", color: "bg-green-500/20 text-green-400", icon: Star },
  co_proposal: { label: "共写提案", color: "bg-orange-500/20 text-orange-400", icon: Target },
  co_collaboration: { label: "共创项目", color: "bg-purple-500/20 text-purple-400", icon: Rocket },
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

// =============================================================================
// StarField 组件
// =============================================================================

function StarField() {
  const stars = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// 主页面组件
// =============================================================================

export default function CotrialDetailPage() {
  const { user, isLoading } = useSecondMeSession();
  const params = useParams();
  const router = useRouter();
  const [cotrial, setCotrial] = useState<Cotrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldContinue, setWouldContinue] = useState<boolean | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const cotrialId = params.id as string;

  // 获取共试数据
  const fetchCotrial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cotrials/${cotrialId}`);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setCotrial(result.data);
      } else {
        setError(result.error?.message || "获取共试失败");
      }
    } catch (err) {
      console.error("获取共试失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [cotrialId]);

  useEffect(() => {
    if (cotrialId && user) {
      fetchCotrial();
    }
  }, [cotrialId, user, fetchCotrial]);

  // 处理提交
  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      const res = await fetch(`/api/cotrials/${cotrialId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: response }),
      });
      const result = await res.json();
      if (result.success) {
        setResponse("");
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setError(result.error?.message || "提交失败");
      }
    } catch (err) {
      console.error("提交失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理完成任务
  const handleComplete = async () => {
    if (!response.trim()) {
      setError("请先提交内容后再完成任务");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cotrials/${cotrialId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          result: response,
        }),
      });
      const result = await res.json();
      if (result.success) {
        router.push(`/cotrials/${cotrialId}/result`);
      } else {
        setError(result.error?.message || "完成任务失败");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("完成任务失败:", err);
      setError("网络错误，请稍后重试");
      setIsSubmitting(false);
    }
  };

  // 处理放弃
  const handleAbandon = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/cotrials/${cotrialId}`, {
        method: "DELETE",
      });
      router.push("/matches");
    } catch (err) {
      console.error("放弃失败:", err);
    } finally {
      setIsSubmitting(false);
      setShowAbandonConfirm(false);
    }
  };

  // 处理评分反馈
  const handleRate = async () => {
    if (rating === 0) {
      setError("请选择评分");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cotrials/${cotrialId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          satisfaction: rating,
          comment: comment.trim() || undefined,
          wouldContinue: wouldContinue ?? undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        // 更新本地状态
        setCotrial((prev) => prev ? {
          ...prev,
          [user.userId === cotrial?.debate?.match?.user_a_id ? 'feedback_a' : 'feedback_b']: {
            satisfaction: rating,
            comment: comment.trim(),
            wouldContinue: wouldContinue,
          }
        } : null);
        setComment("");
        setWouldContinue(null);
        setRating(0);
      } else {
        setError(result.error?.message || "提交反馈失败");
      }
    } catch (err) {
      console.error("提交反馈失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载状态
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <span className="ml-2 text-violet-400/60">加载中...</span>
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-[#0a0908] to-[#0a0908]" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/10 mb-6">
              <Rocket className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-violet-50 mb-4">
              共试层
            </h1>
            <p className="text-violet-300/60 mb-8">
              登录后进入共试层，开始低成本协作验证
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
            >
              <Link href="/login">立即登录</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchCotrial}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  // 无共试数据
  if (!cotrial) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <p className="text-violet-400/60">未找到共试</p>
      </div>
    );
  }

  const taskInfo = taskTypeLabels[cotrial.task_type] || taskTypeLabels.co_write;
  const TaskIcon = taskInfo.icon;

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-[#0a0908] to-[#0a0908]" />
        <StarField />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
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
            className="inline-flex items-center gap-2 text-violet-400/70 hover:text-violet-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回知遇卡
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-violet-50">
                共试层
              </h1>
              <p className="text-violet-300/60 text-sm">
                最小化协作，验证关系可行性
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
          {/* 任务信息 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-violet-900/40 to-purple-900/20 border-violet-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${taskInfo.color}`}>
                      <TaskIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-violet-100">{taskInfo.label}</CardTitle>
                      <CardDescription className="text-violet-400/60">
                        协作任务
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                    {cotrial.completed ? "已完成" : "进行中"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 任务目标 */}
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-200">任务目标</p>
                    <p className="text-sm text-violet-300/70">{cotrial.task_goal}</p>
                  </div>
                </div>

                {/* 预计时长 */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-200">预计时长</p>
                    <p className="text-sm text-violet-300/70">{cotrial.task_duration}</p>
                  </div>
                </div>

                {/* 任务描述 */}
                <div className="p-4 rounded-lg bg-violet-950/30 border border-violet-500/20">
                  <p className="text-sm text-violet-300/80 whitespace-pre-line">
                    {cotrial.task_description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 协作区 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-violet-900/20 border-violet-500/30">
              <CardHeader>
                <CardTitle className="text-violet-100 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  协作区
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 你的输入 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border border-violet-500/30">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-violet-900/50 text-violet-200 text-xs">
                        你
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-violet-300">你的回复</span>
                  </div>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="在这里输入你的内容..."
                    rows={6}
                    disabled={cotrial.completed}
                    className="bg-violet-950/30 border-violet-500/30 text-violet-100 placeholder:text-violet-500/50 focus:border-violet-400/50 focus:ring-violet-400/20"
                  />
                  {/* 提交成功提示 */}
                  {submitSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <Check className="w-4 h-4" />
                      内容已提交
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAbandonConfirm(true)}
              disabled={isSubmitting}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
            >
              <X className="w-4 h-4 mr-2" />
              放弃共试
            </Button>

            <ConfirmDialog
              open={showAbandonConfirm}
              onOpenChange={setShowAbandonConfirm}
              title="放弃共试"
              description="确定要放弃此共试吗？放弃后将无法撤销，合作记录将被永久删除。"
              confirmText="放弃"
              variant="danger"
              onConfirm={handleAbandon}
              isLoading={isSubmitting}
            />

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!response.trim() || isSubmitting || cotrial.completed}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    提交内容
                  </>
                )}
              </Button>
              <Button
                onClick={handleComplete}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
              >
                <Check className="w-4 h-4 mr-2" />
                完成任务
              </Button>
            </div>
          </motion.div>

          {/* 底部提示 */}
          <motion.div variants={itemVariants}>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-violet-900/10 border border-violet-500/20">
              <Star className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-violet-300/70">
                <p className="font-medium text-violet-300 mb-1">完成反馈</p>
                <p>完成任务后，你可以为对方提供反馈。成功的协作将进入长期关系追踪。</p>
              </div>
            </div>
          </motion.div>

          {/* 评分反馈区域 - 仅共试完成后显示 */}
          {cotrial.completed && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-amber-900/40 to-orange-900/20 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    合作评价
                  </CardTitle>
                  <CardDescription className="text-amber-400/60">
                    你的反馈将帮助对方成长，也将影响未来匹配质量
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 星级评分 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-amber-200">满意评分</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-amber-700/50"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-amber-300/70 text-sm">
                        {rating === 1 && "失望"}
                        {rating === 2 && "一般"}
                        {rating === 3 && "满意"}
                        {rating === 4 && "很满意"}
                        {rating === 5 && "超出预期"}
                      </span>
                    </div>
                  </div>

                  {/* 评价内容 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-amber-200">评价内容（可选）</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="分享你的合作体验..."
                      rows={3}
                      className="bg-amber-950/30 border-amber-500/30 text-amber-100 placeholder:text-amber-700/50 focus:border-amber-400/50 focus:ring-amber-400/20"
                    />
                  </div>

                  {/* 是否继续合作 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-amber-200">是否愿意继续合作</label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={wouldContinue === true ? "default" : "outline"}
                        onClick={() => setWouldContinue(true)}
                        className={
                          wouldContinue === true
                            ? "bg-emerald-600 hover:bg-emerald-500 border-0"
                            : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/20"
                        }
                      >
                        <Check className="w-4 h-4 mr-2" />
                        愿意
                      </Button>
                      <Button
                        type="button"
                        variant={wouldContinue === false ? "default" : "outline"}
                        onClick={() => setWouldContinue(false)}
                        className={
                          wouldContinue === false
                            ? "bg-red-600 hover:bg-red-500 border-0"
                            : "border-red-500/30 text-red-300 hover:bg-red-900/20"
                        }
                      >
                        <X className="w-4 h-4 mr-2" />
                        暂不
                      </Button>
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  <Button
                    onClick={handleRate}
                    disabled={rating === 0 || isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交评价
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
