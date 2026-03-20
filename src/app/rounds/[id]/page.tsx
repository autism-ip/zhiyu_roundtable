/**
 * 圆桌详情页
 * [INPUT]: 依赖 @/components/rounds/* 的子组件，依赖 @/lib/api 的 API 函数
 * [OUTPUT]: 对外提供圆桌详情页面
 * [POS]: app/rounds/[id]/page.tsx - 圆桌讨论详情页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Clock,
  Send,
  Sparkles,
  BookOpen,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

// ============================================
// 类型定义
// ============================================

interface RoundData {
  id: string;
  name: string;
  description: string;
  topic: { title: string; category: string };
  status: "waiting" | "ongoing" | "completed";
  max_agents: number;
  participant_count: number;
  message_count: number;
  created_at: string;
  host: {
    id: string;
    name: string;
    avatar: string | null;
    agent_name: string;
  };
}

interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar: string | null;
  agent_name: string;
  agent_expertise: string[];
  role: string;
}

interface Message {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string | null;
  content: string;
  timestamp: string;
  is_highlighted: boolean;
}

// 动画变体
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// 状态徽章组件
function StatusBadge({ status }: { status: string }) {
  const config = {
    ongoing: { label: "进行中", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    waiting: { label: "等待中", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    completed: { label: "已完成", className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  };

  const { label, className } = config[status as keyof typeof config] || config.waiting;

  return (
    <Badge variant="outline" className={className}>
      <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
      {label}
    </Badge>
  );
}

// 参与者卡片组件
function ParticipantCard({
  participant,
  isActive,
}: {
  participant: Participant;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative p-4 rounded-xl bg-gradient-to-br from-amber-950/30 to-amber-900/10 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 cursor-pointer group"
    >
      {/* 活跃指示器 */}
      {isActive && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-amber-500/30">
          <AvatarImage src={participant.avatar || undefined} />
          <AvatarFallback className="bg-amber-900/30 text-amber-200 text-sm">
            {participant.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-100 truncate">{participant.name}</p>
          <p className="text-xs text-amber-400/70 truncate">{participant.agent_name}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {participant.agent_expertise.map((exp) => (
          <span
            key={exp}
            className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-300/80 border border-amber-500/10"
          >
            {exp}
          </span>
        ))}
      </div>

      {participant.role === "host" && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-amber-950">
            主
          </span>
        </div>
      )}
    </motion.div>
  );
}

// 消息卡片组件
function MessageCard({
  message,
  index,
}: {
  message: Message;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative p-5 rounded-xl border transition-all duration-300 hover:shadow-lg ${
        message.is_highlighted
          ? "bg-gradient-to-r from-amber-900/30 to-amber-800/10 border-amber-500/30 shadow-amber-500/10"
          : "bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/50 hover:border-slate-600/50"
      }`}
    >
      {/* 装饰边框 */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${
          message.is_highlighted
            ? "bg-gradient-to-b from-amber-500 to-amber-600"
            : "bg-gradient-to-b from-slate-600 to-slate-700"
        }`}
      />

      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 border-2 border-amber-500/20">
          <AvatarImage src={message.agent_avatar || undefined} />
          <AvatarFallback className="bg-amber-900/30 text-amber-200 text-sm">
            {message.agent_name[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-amber-100">{message.agent_name}</span>
            {message.is_highlighted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                <Sparkles className="w-3 h-3" />
                亮点
              </span>
            )}
            <span className="text-xs text-slate-500">{message.timestamp}</span>
          </div>

          <p className="text-slate-300 leading-relaxed">{message.content}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function RoundDetailPage() {
  const { user } = useSecondMeSession();
  const params = useParams();
  const router = useRouter();
  const [messageInput, setMessageInput] = useState("");
  const [round, setRound] = useState<RoundData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roundId = params.id as string;

  // 使用实时消息订阅 Hook
  const { messages, setMessages, isConnected } = useRealtimeMessages(roundId);

  // 获取圆桌详情
  useEffect(() => {
    if (!roundId) return;

    const fetchRound = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/rounds/${roundId}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error?.message || "获取圆桌详情失败");
        }

        setRound(data.data);

        // 从 round 数据中提取参与者信息
        if (data.data.participants && Array.isArray(data.data.participants)) {
          const formattedParticipants: Participant[] = data.data.participants.map(
            (p: any) => {
              // API 返回的结构可能是嵌套的 (user.agent) 或扁平的 (agent_expertise)
              const userData = p.user || p;
              const agentData = userData.agent || p.agent || {};

              return {
                id: p.id || userData.id,
                user_id: p.user_id || userData.id,  // 确保 user_id 被正确提取
                name: userData.name || userData.user?.name || "未知参与者",
                avatar: userData.avatar || userData.user?.avatar || null,
                agent_name: agentData.name || userData.agent_name || "AI Agent",
                agent_expertise: agentData.expertise || userData.agent_expertise || [],
                role: p.role || "participant",
              };
            }
          );
          setParticipants(formattedParticipants);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取圆桌详情失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRound();
  }, [roundId]);

  // 获取参与者列表
  useEffect(() => {
    if (!roundId) return;

    const fetchParticipants = async () => {
      try {
        // TODO: 需要一个获取参与者的 API 端点
        // 暂时从 round 数据中获取参与者信息
      } catch (err) {
        console.error("获取参与者列表失败:", err);
      }
    };

    fetchParticipants();
  }, [roundId]);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 监听圆桌状态变化，触发知遇卡生成 Toast
  useEffect(() => {
    if (round?.status === "completed" && round.participant_count >= 2 && !isGeneratingMatches) {
      setIsGeneratingMatches(true);
      toast.success("圆桌讨论已完成", {
        description: "AI 正在分析参与者，生成知遇卡...",
      });

      // 模拟：实际应由后端 webhook 触发
      setTimeout(() => {
        setIsGeneratingMatches(false);
        toast.success("知遇卡已生成", {
          description: "去知遇卡页面查看你的匹配结果",
          action: {
            label: "查看",
            onClick: () => router.push("/matches"),
          },
        });
      }, 3000);
    }
  }, [round?.status, round?.participant_count, isGeneratingMatches]);

  // 计算用户角色状态
  const isHost = user && round?.host?.id === user.userId;
  const isJoined = user && participants.some(p => p.user_id === user.userId);
  const isFull = round && round.participant_count >= round.max_agents;

  // 加入圆桌处理函数
  const handleJoinRound = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (!user.userId) {
      toast.error('用户信息加载中，请刷新页面重试');
      return;
    }

    if (!round) {
      toast.error('圆桌数据加载中，请稍后');
      return;
    }

    try {
      toast.success('正在加入圆桌...');

      const res = await fetch(`/api/rounds/${roundId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('成功加入圆桌！');
        // 重新获取圆桌数据以更新 UI
        const roundRes = await fetch(`/api/rounds/${roundId}`);
        const roundData = await roundRes.json();
        if (roundData.success) {
          setRound(roundData.data);
          // 更新参与者列表
          if (roundData.data.participants && Array.isArray(roundData.data.participants)) {
            const formattedParticipants: Participant[] = roundData.data.participants.map(
              (p: any) => {
                const userData = p.user || p;
                const agentData = userData.agent || p.agent || {};

                return {
                  id: p.id || userData.id,
                  user_id: p.user_id || userData.id,
                  name: userData.name || userData.user?.name || '未知参与者',
                  avatar: userData.avatar || userData.user?.avatar || null,
                  agent_name: agentData.name || userData.agent_name || 'AI Agent',
                  agent_expertise: agentData.expertise || userData.agent_expertise || [],
                  role: p.role || 'participant',
                };
              }
            );
            setParticipants(formattedParticipants);
          }
        }
      } else {
        toast.error(data.error?.message || '加入失败');
      }
    } catch (err) {
      console.error('加入圆桌失败:', err);
      toast.error('加入圆桌失败，请重试');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user) return;

    try {
      const res = await fetch(`/api/rounds/${roundId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageInput,
          userId: user.userId,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setMessageInput("");
      }
    } catch (err) {
      console.error("发送消息失败:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 删除圆桌
  const handleDeleteRound = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("圆桌已删除");
        router.push("/rounds");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !round) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-50 mb-4">
            {error || "圆桌不存在"}
          </h2>
          <Link
            href="/rounds"
            className="text-amber-400 hover:text-amber-300 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回圆桌广场
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 py-6 max-w-7xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            href="/rounds"
            className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回圆桌广场
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-50">
                  {round.name}
                </h1>
                <StatusBadge status={round.status} />
              </div>

              <p className="text-slate-400 mb-4 max-w-2xl">{round.description}</p>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {round.topic.title}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {round.participant_count} 人参与
                </span>
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {round.message_count} 条讨论
                </span>
              </div>
            </div>

            {round.status === "waiting" && user && (
              <>
                {isHost || isJoined ? (
                  <>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-lg shadow-amber-900/20"
                    >
                      开始讨论
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                    {isHost && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除圆桌
                      </Button>
                    )}
                  </>
                ) : isFull ? (
                  <Button
                    size="lg"
                    disabled
                    className="bg-slate-700 text-slate-400 border-0"
                  >
                    圆桌已满
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleJoinRound}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border-0 shadow-lg shadow-emerald-900/20"
                  >
                    加入圆桌
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.div>

        <Separator className="bg-gradient-to-r from-amber-500/20 via-slate-700/50 to-amber-500/20 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧边栏 - 参与者 */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 order-2 lg:order-1"
          >
            <div className="sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-amber-100">参与者</h2>
                <span className="text-xs text-slate-500">({participants.length})</span>
              </div>

              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  >
                    <ParticipantCard
                      participant={participant}
                      isActive={round.status === "ongoing"}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            title="删除圆桌"
            description="确定要删除此圆桌吗？此操作不可恢复，所有讨论记录将被永久删除。"
            confirmText="删除"
            variant="danger"
            onConfirm={handleDeleteRound}
            isLoading={isDeleting}
          />

          {/* 主内容区 - 消息流 */}
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-3 order-1 lg:order-2"
          >
            <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
              {/* 消息区域 */}
              <div className="h-[500px] overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-4">
                  <AnimatePresence>
                    {(messages || []).map((message, index) => (
                      <MessageCard key={message.id} message={message} index={index} />
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <Separator className="bg-slate-800/50" />

              {/* 输入区域 */}
              <div className="p-4">
                {round.status === "completed" ? (
                  <div className="text-center py-4">
                    <p className="text-slate-500">圆桌已结束</p>
                  </div>
                ) : user ? (
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="参与讨论..."
                        rows={1}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 resize-none transition-all"
                        style={{ minHeight: "48px", maxHeight: "120px" }}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-0 shadow-lg shadow-amber-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-500 mb-3">登录后参与讨论</p>
                    <Button asChild variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-900/20">
                      <Link href="/login">登录</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
