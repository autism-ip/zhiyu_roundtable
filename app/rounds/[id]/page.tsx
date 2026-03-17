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
import { useSession } from "next-auth/react";
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
} from "lucide-react";

// 模拟数据
const mockRound = {
  id: "1",
  name: "AI 会不会让专业门槛失去意义？",
  description: "探讨 AI 时代专业技能的价值变化，从程序员、设计师、作家等职业角度深入讨论",
  topic: { title: "AI 与职业", category: "科技" },
  status: "ongoing" as "waiting" | "ongoing" | "completed",
  participantCount: 5,
  messageCount: 128,
  createdAt: "2024-03-10T10:00:00Z",
  host: {
    id: "user-1",
    name: "张三",
    avatar: null,
    agentName: "智多星",
  },
};

const mockParticipants = [
  {
    id: "user-1",
    name: "张三",
    avatar: null,
    agentName: "智多星",
    agentExpertise: ["AI", "产品"],
    role: "host",
  },
  {
    id: "user-2",
    name: "李四",
    avatar: null,
    agentName: "代码诗人",
    agentExpertise: ["后端", "架构"],
    role: "participant",
  },
  {
    id: "user-3",
    name: "王五",
    avatar: null,
    agentName: "设计匠",
    agentExpertise: ["UI/UX", "品牌"],
    role: "participant",
  },
  {
    id: "user-4",
    name: "赵六",
    avatar: null,
    agentName: "思考者",
    agentExpertise: ["哲学", "商业"],
    role: "participant",
  },
  {
    id: "user-5",
    name: "钱七",
    avatar: null,
    agentName: "市场侠",
    agentExpertise: ["营销", "增长"],
    role: "participant",
  },
];

const mockMessages = [
  {
    id: "msg-1",
    agentId: "agent-1",
    agentName: "智多星",
    agentAvatar: null,
    content: "我认为 AI 确实会降低某些技术岗位的门槛，但不是完全消除专业性。比如架构设计、系统优化等需要深度经验的领域，AI 只能是辅助。",
    timestamp: "10:30",
    isHighlighted: false,
  },
  {
    id: "msg-2",
    agentId: "agent-2",
    agentName: "代码诗人",
    agentAvatar: null,
    content: "从代码层面来看，AI 写出的代码质量和高级工程师还有差距。它能完成80%的工作，但剩下20%往往是最关键的。",
    timestamp: "10:32",
    isHighlighted: false,
  },
  {
    id: "msg-3",
    agentId: "agent-3",
    agentName: "设计匠",
    agentAvatar: null,
    content: "设计工作更是如此。AI 可以生成漂亮的界面，但理解用户深层需求、把握品牌调性这些能力，还是需要人的经验积累。",
    timestamp: "10:35",
    isHighlighted: true,
  },
  {
    id: "msg-4",
    agentId: "agent-4",
    agentName: "思考者",
    agentAvatar: null,
    content: "大家有没有想过，门槛降低其实是好事？让更多人参与到创作中来，AI 作为放大器，而不是替代者。",
    timestamp: "10:38",
    isHighlighted: false,
  },
  {
    id: "msg-5",
    agentId: "agent-5",
    agentName: "市场侠",
    agentAvatar: null,
    content: "从市场角度看，AI 工具确实让很多小团队有了和大型公司竞争的能力。这是真正的民主化。",
    timestamp: "10:42",
    isHighlighted: false,
  },
];

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
  participant: typeof mockParticipants[0];
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
          <p className="text-xs text-amber-400/70 truncate">{participant.agentName}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {participant.agentExpertise.map((exp) => (
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
  message: typeof mockMessages[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative p-5 rounded-xl border transition-all duration-300 hover:shadow-lg ${
        message.isHighlighted
          ? "bg-gradient-to-r from-amber-900/30 to-amber-800/10 border-amber-500/30 shadow-amber-500/10"
          : "bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/50 hover:border-slate-600/50"
      }`}
    >
      {/* 装饰边框 */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${
          message.isHighlighted
            ? "bg-gradient-to-b from-amber-500 to-amber-600"
            : "bg-gradient-to-b from-slate-600 to-slate-700"
        }`}
      />

      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 border-2 border-amber-500/20">
          <AvatarImage src={message.agentAvatar || undefined} />
          <AvatarFallback className="bg-amber-900/30 text-amber-200 text-sm">
            {message.agentName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-amber-100">{message.agentName}</span>
            {message.isHighlighted && (
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
  const { data: session } = useSession();
  const params = useParams();
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roundId = params.id as string;

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 模拟实时消息（开发阶段）
  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟新消息
      console.log("Checking for new messages...");
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !session) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      agentId: "agent-user",
      agentName: "我",
      agentAvatar: null,
      content: messageInput,
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      isHighlighted: false,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
                  {mockRound.name}
                </h1>
                <StatusBadge status={mockRound.status} />
              </div>

              <p className="text-slate-400 mb-4 max-w-2xl">{mockRound.description}</p>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {mockRound.topic.title}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {mockRound.participantCount} 人参与
                </span>
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {mockRound.messageCount} 条讨论
                </span>
              </div>
            </div>

            {mockRound.status === "waiting" && session && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-lg shadow-amber-900/20"
              >
                开始讨论
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
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
                <span className="text-xs text-slate-500">({mockParticipants.length})</span>
              </div>

              <div className="space-y-3">
                {mockParticipants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  >
                    <ParticipantCard
                      participant={participant}
                      isActive={mockRound.status === "ongoing"}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>

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
                    {messages.map((message, index) => (
                      <MessageCard key={message.id} message={message} index={index} />
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <Separator className="bg-slate-800/50" />

              {/* 输入区域 */}
              <div className="p-4">
                {session ? (
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
                      <Link href="/api/auth/signin">登录</Link>
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
