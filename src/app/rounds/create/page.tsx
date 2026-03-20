/**
 * 创建圆桌页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供创建圆桌页面
 * [POS]: app/rounds/create/page.tsx - 创建圆桌页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

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
  topic: Topic;
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
          ? "border-emerald-500 bg-emerald-500/20"
          : "border-slate-600 bg-slate-800 hover:border-slate-500"
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
  const { user, isLoading: isSessionLoading } = useSecondMeSession();
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [createTopicError, setCreateTopicError] = useState<string | null>(null);
  const [createTopicForm, setCreateTopicForm] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topicId: "",
    maxAgents: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取议题列表
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoading(true);
        setTopicsError(null);
        const res = await fetch('/api/topics');
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          setTopics(data.data);
        }
      } catch (err) {
        console.error('获取议题列表失败:', err);
        setTopicsError('获取议题列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, []);

  // 处理输入变化
  const handleChange = (
    field: string,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 处理创建议题表单变化
  const handleCreateTopicChange = (
    field: string,
    value: string
  ) => {
    setCreateTopicForm((prev) => ({ ...prev, [field]: value }));
  };

  // 创建议题
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTopicForm.title.trim()) {
      setCreateTopicError("请输入议题标题");
      return;
    }

    setIsCreatingTopic(true);
    setCreateTopicError(null);

    try {
      const tags = createTopicForm.tags
        ? createTopicForm.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTopicForm.title,
          description: createTopicForm.description || undefined,
          category: createTopicForm.category || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setTopics((prev) => [...prev, data.data]);
        setShowCreateTopic(false);
        setCreateTopicForm({ title: "", description: "", category: "", tags: "" });
      } else {
        throw new Error(data.error?.message || "创建议题失败");
      }
    } catch (err: any) {
      console.error("创建议题失败:", err);
      setCreateTopicError(err.message || "创建议题失败，请重试");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.topicId) {
      setSubmitError('请填写圆桌名称并选择议题');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          topicId: formData.topicId,
          maxAgents: formData.maxAgents,
        }),
      });

      const data = await res.json();
      console.log('[创建圆桌] API 响应:', { status: res.status, ok: res.ok, data });

      // 检查 HTTP 状态码和业务状态
      // 注意：即使 HTTP 状态码不是 2xx，只要数据实际创建成功（data.data 存在），也认为是成功
      const roundId = data.data?.id || data.data?.round?.id;
      if (roundId) {
        // 成功，跳转到圆桌详情
        console.log('[创建圆桌] 成功，跳转至:', `/rounds/${roundId}`);
        await router.push(`/rounds/${roundId}`);
      } else {
        // 真正失败
        const errorMsg = data.error?.message || `创建失败 (HTTP ${res.status})`;
        console.error('[创建圆桌] 失败:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      // 避免重复设置错误（跳转后组件已卸载）
      if (err.message?.includes('NEXT_REDIRECT')) {
        console.log('[创建圆桌] 跳转中...');
        return;
      }
      console.error('[创建圆桌] 异常:', err);
      setSubmitError(err.message || '创建圆桌失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 未登录状态
  if (!user) {
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
              <Link href="/login">立即登录</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
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
            <div className="flex items-center justify-between mb-3">
              <Label className="text-emerald-100">
                选择议题 <span className="text-red-400">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateTopic(true)}
                className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-900/20 h-8 px-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                创建议题
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="ml-2 text-emerald-400">加载议题中...</span>
              </div>
            ) : topicsError ? (
              <div className="text-red-400 py-4 text-center">{topicsError}</div>
            ) : topics.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
                <p className="text-slate-400 mb-4">暂无可用议题，请先创建议题</p>
                <Button
                  type="button"
                  onClick={() => setShowCreateTopic(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建议题
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    isSelected={formData.topicId === topic.id}
                    onSelect={() => handleChange("topicId", topic.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* 提交错误提示 */}
          {submitError && (
            <motion.div
              variants={itemVariants}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400"
            >
              {submitError}
            </motion.div>
          )}

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

        {/* 创建议题对话框 */}
        <Dialog open={showCreateTopic} onOpenChange={setShowCreateTopic}>
          <DialogContent className="bg-slate-900 border-slate-700 text-emerald-100">
            <form onSubmit={handleCreateTopic}>
              <DialogHeader>
                <DialogTitle className="text-emerald-50">创建议题</DialogTitle>
                <DialogDescription className="text-slate-400">
                  创建一个新议题，之后可用于创建圆桌讨论
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* 议题标题 */}
                <div>
                  <Label htmlFor="topic-title" className="text-emerald-100 mb-2 block">
                    议题标题 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="topic-title"
                    value={createTopicForm.title}
                    onChange={(e) => handleCreateTopicChange("title", e.target.value)}
                    placeholder="例如：AI 与职业发展"
                    className="bg-slate-800/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                {/* 议题描述 */}
                <div>
                  <Label htmlFor="topic-description" className="text-emerald-100 mb-2 block">
                    议题描述
                  </Label>
                  <Textarea
                    id="topic-description"
                    value={createTopicForm.description}
                    onChange={(e) => handleCreateTopicChange("description", e.target.value)}
                    placeholder="详细描述这个议题的背景和讨论方向..."
                    rows={3}
                    className="bg-slate-800/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20 resize-none"
                  />
                </div>

                {/* 分类 */}
                <div>
                  <Label htmlFor="topic-category" className="text-emerald-100 mb-2 block">
                    分类
                  </Label>
                  <Input
                    id="topic-category"
                    value={createTopicForm.category}
                    onChange={(e) => handleCreateTopicChange("category", e.target.value)}
                    placeholder="例如：科技、文化、商业"
                    className="bg-slate-800/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 标签 */}
                <div>
                  <Label htmlFor="topic-tags" className="text-emerald-100 mb-2 block">
                    标签
                  </Label>
                  <Input
                    id="topic-tags"
                    value={createTopicForm.tags}
                    onChange={(e) => handleCreateTopicChange("tags", e.target.value)}
                    placeholder="多个标签用逗号分隔，例如：AI,职业,未来"
                    className="bg-slate-800/50 border-slate-700/50 text-emerald-100 placeholder:text-slate-500 focus:border-emerald-500/30 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 错误提示 */}
                {createTopicError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {createTopicError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTopic(false)}
                  className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={!createTopicForm.title.trim() || isCreatingTopic}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 disabled:opacity-50"
                >
                  {isCreatingTopic ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      创建议题
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
