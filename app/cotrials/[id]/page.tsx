/**
 * 共试层详情页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供共试层详情页面
 * [POS]: app/cotrials/[id]/page.tsx - 共试层详情页
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
} from "lucide-react";

// 模拟数据
const mockCotrial = {
  id: "cotrial-1",
  debateId: "debate-1",
  taskType: "co_write",
  taskDescription: "请围绕「AI时代程序员的价值」主题，共同撰写一篇知乎回答。要求：\n1. 不少于 800 字\n2. 结合实际案例\n3. 有独到见解\n4. 语言风格生动有趣",
  taskGoal: "输出一篇高质量的知乎回答，发布后7天内获得100个赞",
  taskDuration: "7天",
  status: "ongoing" as const,
  userA: {
    id: "user-1",
    name: "张三",
    avatar: null,
    response: "AI时代，程序员的价值不在于写代码本身，而在于...",
  },
  userB: {
    id: "user-2",
    name: "李四",
    avatar: null,
    response: "补充一些关于AI工具使用的案例...",
  },
  createdAt: new Date("2024-03-10"),
};

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

// 星星组件
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

export default function CotrialDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cotrialId = params.id as string;
  const cotrial = mockCotrial;
  const taskInfo = taskTypeLabels[cotrial.taskType] || taskTypeLabels.co_write;
  const TaskIcon = taskInfo.icon;

  // 处理提交
  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setResponse("");
    setIsSubmitting(false);
  };

  // 处理完成任务
  const handleComplete = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/matches");
    setIsSubmitting(false);
  };

  // 处理放弃
  const handleAbandon = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/matches");
    setIsSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="animate-pulse text-violet-400">加载中...</div>
      </div>
    );
  }

  if (!session) {
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-[#0a0908] to-[#0a0908]" />
        <StarField />
        {/* 银河效果 */}
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
                        与 {cotrial.userB.name} 的协作任务
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                    进行中
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 任务目标 */}
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-200">任务目标</p>
                    <p className="text-sm text-violet-300/70">{cotrial.taskGoal}</p>
                  </div>
                </div>

                {/* 预计时长 */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-200">预计时长</p>
                    <p className="text-sm text-violet-300/70">{cotrial.taskDuration}</p>
                  </div>
                </div>

                {/* 任务描述 */}
                <div className="p-4 rounded-lg bg-violet-950/30 border border-violet-500/20">
                  <p className="text-sm text-violet-300/80 whitespace-pre-line">
                    {cotrial.taskDescription}
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
                {/* 对方的内容 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border border-violet-500/30">
                      <AvatarImage src={cotrial.userB.avatar || undefined} />
                      <AvatarFallback className="bg-violet-900/50 text-violet-200 text-xs">
                        {cotrial.userB.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-violet-300">{cotrial.userB.name}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-violet-950/30 border border-violet-500/20 text-violet-200/80">
                    {cotrial.userB.response}
                  </div>
                </div>

                {/* 你的输入 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border border-violet-500/30">
                      <AvatarImage src={session.user?.image || undefined} />
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
                    className="bg-violet-950/30 border-violet-500/30 text-violet-100 placeholder:text-violet-500/50 focus:border-violet-400/50 focus:ring-violet-400/20"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleAbandon}
              disabled={isSubmitting}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
            >
              <X className="w-4 h-4 mr-2" />
              放弃共试
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!response.trim() || isSubmitting}
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
        </motion.div>
      </div>
    </div>
  );
}
