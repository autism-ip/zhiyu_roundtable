/**
 * 争鸣层详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供争鸣层详情页面
 * [POS]: app/debates/[id]/page.tsx - 争鸣层详情页
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
} from "lucide-react";

// 模拟数据
const mockDebate = {
  id: "debate-1",
  matchId: "match-1",
  scenario: "cofounder",
  status: "ongoing" as const,
  currentQuestion: 1,
  totalQuestions: 3,
  questions: [
    {
      id: "q1",
      question: "如果你们要一起做一个项目，遇到意见分歧时，你会怎么处理？",
      type: "conflict",
      context: "测试冲突处理能力",
      userAResponse: "",
      userBResponse: "我会先倾听对方的观点，理解背后的原因，然后寻找共同点。",
    },
    {
      id: "q2",
      question: "描述一个你过去做过的最冒险的决定，结果如何？",
      type: "scenario",
      context: "了解风险偏好",
      userAResponse: "",
      userBResponse: "",
    },
    {
      id: "q3",
      question: "在资源有限的情况下，你会优先考虑产品质量还是上线速度？",
      type: "decision",
      context: "测试决策风格",
      userAResponse: "",
      userBResponse: "",
    },
  ],
  userA: {
    id: "user-1",
    name: "张三",
    avatar: null,
  },
  userB: {
    id: "user-2",
    name: "李四",
    avatar: null,
  },
  createdAt: new Date("2024-03-10"),
};

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

// 问题卡片组件
function QuestionCard({
  question,
  index,
  isActive,
  onResponseChange,
}: {
  question: typeof mockDebate.questions[0];
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
            <h3 className="text-lg font-medium text-cyan-100">{question.question}</h3>
            <p className="text-sm text-cyan-400/60">{question.context}</p>
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
            value={question.userAResponse}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="输入你的回答..."
            rows={4}
            className="bg-cyan-950/30 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-500/50 focus:border-cyan-400/50 focus:ring-cyan-400/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-cyan-300/70">对方的回答</label>
          <div className="h-[100px] p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-cyan-300/60 text-sm">
            {question.userBResponse || "对方还未回答"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 进度指示器
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

export default function DebateDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debateId = params.id as string;
  const debate = mockDebate;
  const currentQuestion = debate.questions[debate.currentQuestion - 1];

  // 处理提交
  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (debate.currentQuestion < debate.totalQuestions) {
      // 下一题
      router.push(`/debates/${debateId}?question=${debate.currentQuestion + 1}`);
    } else {
      // 完成争鸣
      router.push(`/debates/${debateId}/result`);
    }
    setIsSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="animate-pulse text-cyan-400">加载中...</div>
      </div>
    );
  }

  if (!session) {
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#0a0908] to-[#0a0908]" />
        {/* 深海气泡效果 */}
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
            <ProgressIndicator current={debate.currentQuestion} total={debate.totalQuestions} />
          </div>
        </motion.div>

        {/* 进度条 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between text-sm text-cyan-400/60 mb-2">
            <span>问题 {debate.currentQuestion} / {debate.totalQuestions}</span>
            <span>{Math.round((debate.currentQuestion / debate.totalQuestions) * 100)}%</span>
          </div>
          <Progress
            value={(debate.currentQuestion / debate.totalQuestions) * 100}
            className="h-2 bg-cyan-950"
          />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 参与者信息 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-cyan-900/20 border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-cyan-500/30">
                      <AvatarImage src={debate.userA.avatar || undefined} />
                      <AvatarFallback className="bg-cyan-900/50 text-cyan-200">
                        {debate.userA.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-cyan-100 font-medium">{debate.userA.name}</p>
                      <p className="text-xs text-cyan-400/60">你</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Scale className="w-5 h-5" />
                    <span className="text-sm">VS</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-cyan-100 font-medium">{debate.userB.name}</p>
                      <p className="text-xs text-cyan-400/60">对方</p>
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-cyan-500/30">
                      <AvatarImage src={debate.userB.avatar || undefined} />
                      <AvatarFallback className="bg-cyan-900/50 text-cyan-200">
                        {debate.userB.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 问题区域 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border-cyan-500/30">
              <CardContent className="p-6">
                <QuestionCard
                  question={currentQuestion}
                  index={debate.currentQuestion - 1}
                  isActive={true}
                  onResponseChange={setResponse}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between pt-4"
          >
            <Button
              variant="outline"
              disabled={debate.currentQuestion === 1}
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
                disabled={!response.trim() || isSubmitting}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : debate.currentQuestion < debate.totalQuestions ? (
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
