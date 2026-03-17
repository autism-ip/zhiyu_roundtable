/**
 * 创建圆桌页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供创建圆桌页面
 * [POS]: app/rounds/create/page.tsx - 创建圆桌页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Users,
  MessageSquare,
  Sparkles,
  Clock,
  Check,
  X,
} from "lucide-react";

// 模拟议题数据
const mockTopics = [
  {
    id: "topic-1",
    title: "AI 与职业发展",
    description: "探讨 AI 如何改变职业发展和技能需求",
    category: "科技",
    tags: ["AI", "职业", "未来"],
  },
  {
    id: "topic-2",
    title: "创业机会与挑战",
    description: "分享创业经验，讨论当前创业环境",
    category: "商业",
    tags: ["创业", "商业", "机会"],
  },
  {
    id: "topic-3",
    title: "产品设计思维",
    description: "从用户角度出发，探讨产品设计方法论",
    category: "产品",
    tags: ["产品", "设计", "用户体验"],
  },
  {
    id: "topic-4",
    title: "技术架构演进",
    description: "讨论现代技术架构趋势和最佳实践",
    category: "技术",
    tags: ["架构", "后端", "分布式"],
  },
];

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

// 议题卡片组件
function TopicCard({
  topic,
  isSelected,
  onSelect,
}: {
  topic: typeof mockTopics[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600"
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border-2 border-slate-600/30">
          <AvatarImage src={topic.category} />
          <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
            {topic.category[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-medium text-slate-100">{topic.title}</h4>
          <p className="text-sm text-slate-400 mt-1">{topic.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CreateRoundPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topicId: "",
    maxAgents: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理输入变化
  const handleChange = (
    field: string,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.topicId) return;

    setIsSubmitting(true);

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 跳转到圆桌详情页
    router.push("/rounds/new-round-id");
  };

  // 未登录状态
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-[#0a0908] to-[#0a0908]" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
              <Users className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-emerald-50 mb-4">
              创建圆桌
            </h1>
            <p className="text-emerald-300/60 mb-8">
              登录后创建你的圆桌，邀请他人参与讨论
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0"
            >
              <Link href="/api/auth/signin">立即登录</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="animate-pulse text-emerald-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-[#0a0908] to-[#0a0908]" />
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
            href="/rounds"
            className="inline-flex items-center gap-2 text-emerald-400/70 hover:text-emerald-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回圆桌广场
          </Link>

          <h1 className="text-3xl font-serif font-bold text-emerald-50 mb-2">
            创建圆桌
          </h1>
          <p className="text-emerald-300/60">
            发起一个讨论话题，邀请他人参与
          </p>
        </motion.div>

        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* 圆桌名称 */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="name" className="text-emerald-100 mb-2 block">
              圆桌名称 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="例如：AI 会不会让专业门槛失去意义？"
              className="bg-slate-900/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20"
              required
            />
          </motion.div>

          {/* 圆桌描述 */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="description" className="text-emerald-100 mb-2 block">
              圆桌描述
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="详细描述这个圆桌讨论的话题和背景..."
              rows={4}
              className="bg-slate-900/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20 resize-none"
            />
          </motion.div>

          {/* 选择议题 */}
          <motion.div variants={itemVariants}>
            <Label className="text-emerald-100 mb-3 block">
              选择议题 <span className="text-red-400">*</span>
            </Label>
            <div className="grid gap-3 md:grid-cols-2">
              {mockTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  isSelected={formData.topicId === topic.id}
                  onSelect={() => handleChange("topicId", topic.id)}
                />
              ))}
            </div>
          </motion.div>

          {/* 最大参与人数 */}
          <motion.div variants={itemVariants}>
            <Label className="text-emerald-100 mb-3 block">
              最大参与人数
            </Label>
            <Select
              value={formData.maxAgents.toString()}
              onValueChange={(value) => handleChange("maxAgents", parseInt(value))}
            >
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-700/50 text-emerald-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {[3, 5, 8, 10].map((num) => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    className="text-emerald-100 focus:bg-emerald-900/30 focus:text-emerald-100"
                  >
                    {num} 人
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* 提交按钮 */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-end gap-4 pt-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!formData.name || !formData.topicId || isSubmitting}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  创建圆桌
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}
