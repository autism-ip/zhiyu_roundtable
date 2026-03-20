/**
 * 争鸣层详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供争鸣层详情页面
 * [POS]: app/debates/[id]/page.tsx - 争鸣层详情页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  MessageSquare,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Sparkles,
  Lightbulb,
  Shield,
  Scale,
  Loader2,
} from "lucide-react";

// =============================================================================
// 类型定义
// =============================================================================

interface Question {
  id: string;
  type: string;
  content: string;
  purpose: string;
  expectedDimensions: string[];
  userResponse?: string;
  partnerResponse?: string;
}

interface DebateUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface Debate {
  id: string;
  match_id: string;
  scenario: string;
  questions: Question[];
  responses: any[];
  analysis: any;
  relationship_suggestion: string;
  should_connect: boolean;
  risk_areas: string[];
  next_steps: string[];
  status: "waiting" | "ongoing" | "completed";
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: Debate;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 常量
// =============================================================================

// 问题类型映射
const questionTypeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  conflict: { label: "冲突处理", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
  scenario: { label: "场景模拟", color: "bg-blue-500/20 text-blue-400", icon: Lightbulb },
  decision: { label: "决策风格", color: "bg-purple-500/20 text-purple-400", icon: Target },
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
// QuestionCard 组件
// =============================================================================

function QuestionCard({
  question,
  index,
  isActive,
  onResponseChange,
}: {
  question: Question;
  index: number;
  isActive: boolean;
  onResponseChange: (response: string) => void;
}) {
  const typeInfo = questionTypeLabels[question.type] || questionTypeLabels.conflict;
  const Icon = typeInfo.icon;

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-cyan-100">{question.content}</h3>
            <p className="text-sm text-cyan-400/60">{question.purpose}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
          {typeInfo.label}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-cyan-300/70">你的回答</label>
          <Textarea
            value={question.userResponse || ""}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="输入你的回答..."
            rows={4}
            className="bg-cyan-950/30 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-500/50 focus:border-cyan-400/50 focus:ring-cyan-400/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-cyan-300/70">对方的回答</label>
          <div className="h-[100px] p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-cyan-300/60 text-sm">
            {question.partnerResponse || "对方还未回答"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// ProgressIndicator 组件
// =============================================================================

function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < current
              ? "w-8 bg-gradient-to-r from-cyan-500 to-blue-500"
              : i === current
              ? "w-4 bg-cyan-500"
              : "w-2 bg-cyan-900"
          }`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// 主页面组件
// =============================================================================

export default function DebateDetailPage() {
  const { user, isLoading } = useSecondMeSession();
  const params = useParams();
  const router = useRouter();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debateId = params.id as string;

  // 获取辩论数据
  const fetchDebate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/debates/${debateId}`);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setDebate(result.data);
        // 初始化 responses
        const initialResponses: Record<string, string> = {};
        result.data.questions.forEach((q: Question) => {
          initialResponses[q.id] = q.userResponse || "";
        });
        setResponses(initialResponses);
      } else {
        setError(result.error?.message || "获取辩论失败");
      }
    } catch (err) {
      console.error("获取辩论失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [debateId]);

  useEffect(() => {
    if (debateId) {
      fetchDebate();
    }
  }, [debateId, fetchDebate]);

  // 处理回答变化
  const handleResponseChange = (questionId: string, response: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: response }));
  };

  // 处理提交
  const handleSubmit = async () => {
    if (!debate) return;

    const currentQuestion = debate.questions[currentQuestionIndex];
    if (!responses[currentQuestion.id]?.trim()) return;

    setIsSubmitting(true);

    try {
      // 提交回答
      await fetch(`/api/debates/${debateId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          response: responses[currentQuestion.id],
        }),
      });

      // 移动到下一题或完成
      if (currentQuestionIndex < debate.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // 完成争鸣
        await fetch(`/api/debates/${debateId}/complete`, {
          method: "POST",
        });
        router.push(`/debates/${debateId}/result`);
      }
    } catch (err) {
      console.error("提交失败:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载状态
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <span className="ml-2 text-cyan-400/60">加载中...</span>
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#0a0908] to-[#0a0908]" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 mb-6">
              <Brain className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-cyan-50 mb-4">
              争鸣层
            </h1>
            <p className="text-cyan-300/60 mb-8">
              登录后进入争鸣层，验证合作可行性
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0"
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
          <Button variant="outline" onClick={fetchDebate}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  // 无辩论数据
  if (!debate) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <p className="text-cyan-400/60">未找到辩论</p>
      </div>
    );
  }

  const currentQuestion = debate.questions[currentQuestionIndex];
  const totalQuestions = debate.questions.length;
  const currentResponse = responses[currentQuestion?.id] || "";

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
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
            className="inline-flex items-center gap-2 text-cyan-400/70 hover:text-cyan-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回知遇卡
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-cyan-50">
                  争鸣层
                </h1>
                <p className="text-cyan-300/60 text-sm">
                  结构化对练，验证合作可行性
                </p>
              </div>
            </div>
            <ProgressIndicator current={currentQuestionIndex + 1} total={totalQuestions} />
          </div>
        </motion.div>

        {/* 进度条 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between text-sm text-cyan-400/60 mb-2">
            <span>问题 {currentQuestionIndex + 1} / {totalQuestions}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
          </div>
          <Progress
            value={((currentQuestionIndex + 1) / totalQuestions) * 100}
            className="h-2 bg-cyan-950"
          />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 操作按钮 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/20"
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              上一题
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/20"
              >
                暂不回答
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!currentResponse.trim() || isSubmitting}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : currentQuestionIndex < totalQuestions - 1 ? (
                  <>
                    下一题
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    完成争鸣
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* 底部提示 */}
          <motion.div variants={itemVariants}>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-900/10 border border-cyan-500/20">
              <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-300/70">
                <p className="font-medium text-cyan-300 mb-1">隐私保护</p>
                <p>你的回答仅用于AI分析，不会直接展示给对方。分析完成后，双方可以看到整体兼容性评估。</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
