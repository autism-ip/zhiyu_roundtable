/**
 * 时间线页面
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供时间线页面
 * [POS]: app/timeline/page.tsx - 回忆功能页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Activity,
  Loader2,
  Calendar,
  User,
  Bot,
  Circle,
  Lightbulb,
} from "lucide-react";

// =============================================================================
// 类型定义
// =============================================================================

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    type: "user" | "agent" | "system";
    id: string;
  };
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  summary: string;
}

interface ApiResponse {
  success: boolean;
  data?: TimelineEvent[];
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 常量
// =============================================================================

// 动作类型到图标的映射
const actionIconMap: Record<string, React.ReactNode> = {
  user: <User className="w-4 h-4" />,
  agent: <Bot className="w-4 h-4" />,
  system: <Circle className="w-4 h-4" />,
};

// 动作类型到颜色的映射
const actionColorMap: Record<string, string> = {
  round: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  match: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  debate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cotrial: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  message: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

// 动画变体
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

// =============================================================================
// TimelineItem 组件
// =============================================================================

function TimelineItem({ event }: { event: TimelineEvent }) {
  // 根据资源类型获取颜色
  const colorClass = actionColorMap[event.resource.type] || actionColorMap.message;
  const actorIcon = actionIconMap[event.actor.type] || actionIconMap.user;

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="relative pl-8 pb-8"
    >
      {/* 时间线连接线 */}
      {event.id !== "last" && (
        <div className="absolute left-[15px] top-8 w-0.5 h-full bg-gradient-to-b from-violet-500/50 to-violet-500/10" />
      )}

      {/* 时间线节点 */}
      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border ${colorClass}`}>
        {actorIcon}
      </div>

      {/* 内容卡片 */}
      <div className="bg-violet-950/30 border border-violet-500/20 rounded-lg p-4 hover:border-violet-500/40 transition-all">
        <div className="flex items-start justify-between mb-2">
          <span className="text-violet-100 font-medium">{event.summary}</span>
          <span className="text-violet-400/60 text-sm flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(event.timestamp)}
          </span>
        </div>

        {event.resource.name && (
          <p className="text-violet-300/60 text-sm mb-1">
            {event.resource.type === "round" && "圆桌: "}
            {event.resource.type === "match" && "知遇卡: "}
            {event.resource.name}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
            {event.action}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// EmptyState 组件
// =============================================================================

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
        <Lightbulb className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-medium text-violet-200 mb-2">
        暂无历史记录
      </h3>
      <p className="text-violet-400/60 max-w-sm mx-auto">
        开始参与圆桌讨论，创建知遇卡，让你的足迹在这里留下印记
      </p>
      <Button
        asChild
        variant="outline"
        className="mt-4 border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
      >
        <a href="/rounds">前往圆桌广场</a>
      </Button>
    </motion.div>
  );
}

// =============================================================================
// 主页面组件
// =============================================================================

export default function TimelinePage() {
  const { user } = useSecondMeSession();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取时间线数据
  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/timeline");
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        setError(result.error?.message || "获取时间线失败");
        setEvents([]);
      }
    } catch (err) {
      console.error("获取时间线失败:", err);
      setError("网络错误，请稍后重试");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTimeline();
    }
  }, [user, fetchTimeline]);

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
              <Activity className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-violet-50 mb-4">
              时间线
            </h1>
            <p className="text-violet-300/60 mb-8">
              登录后查看你的活动足迹，回顾每一次成长与连接
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
            >
              <a href="/login">立即登录</a>
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
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-3xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-serif font-bold text-violet-50 mb-2 flex items-center gap-3">
            <Clock className="w-8 h-8" />
            时间线
          </h1>
          <p className="text-violet-300/60">
            回顾你的每一次成长与连接
          </p>
        </motion.div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <span className="ml-2 text-violet-300/60">加载中...</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchTimeline}>
              重试
            </Button>
          </div>
        )}

        {/* 时间线内容 */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            {events.length > 0 ? (
              <motion.div
                key="timeline"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* 添加最后一个节点的标记 */}
                {events.map((event, index) => (
                  <TimelineItem
                    key={event.id}
                    event={index === events.length - 1 ? { ...event, id: "last" } : event}
                  />
                ))}
              </motion.div>
            ) : (
              <EmptyState key="empty" />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
