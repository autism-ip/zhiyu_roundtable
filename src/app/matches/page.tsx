/**
 * 知遇卡列表页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供知遇卡列表页面
 * [POS]: app/matches/page.tsx - 知遇卡列表页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles,
  Heart,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Users,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// =============================================================================
// 类型定义
// =============================================================================

interface MatchUser {
  id: string;
  name: string;
  avatar: string | null;
  expertise: string[];
}

interface Match {
  id: string;
  round_id: string;
  user_a_id: string;
  user_b_id: string;
  user_a?: MatchUser;
  user_b?: MatchUser;
  complementarity_score: number;
  future_generativity: number;
  overall_score: number;
  relationship_type: string;
  match_reason: string;
  complementarity_areas: string[];
  insights: any[];
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: Match[];
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 常量
// =============================================================================

// 关系类型映射
const relationshipLabels: Record<string, string> = {
  cofounder: "共创搭子",
  peer: "同道",
  opponent: "对手",
  advisor: "顾问",
  mentee: "学徒",
  none: "暂不建议",
};

// 状态配置
const statusConfig = {
  pending: {
    label: "待接受",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    action: "接受",
  },
  accepted: {
    label: "已接受",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    action: "查看",
  },
  declined: {
    label: "已婉拒",
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    action: "查看",
  },
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// =============================================================================
// MatchCard 组件
// =============================================================================

interface MatchCardProps {
  match: Match;
  onAccept: (matchId: string) => Promise<void>;
  onDecline: (matchId: string) => Promise<void>;
  onDeclineClick: (matchId: string) => void;
  loadingMatchId: string | null;
}

function MatchCard({ match, onAccept, onDecline, onDeclineClick, loadingMatchId }: MatchCardProps) {
  const statusKey = match.status as keyof typeof statusConfig;
  const status = statusConfig[statusKey] || statusConfig.pending;
  const userB = match.user_b;
  const isLoading = loadingMatchId === match.id;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-violet-950/30 to-purple-900/10 border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 group">
        {/* 装饰光晕 */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all" />

        <CardHeader className="relative pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-violet-500/30">
                <AvatarImage src={userB?.avatar || undefined} />
                <AvatarFallback className="bg-violet-900/30 text-violet-200">
                  {userB?.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg text-violet-100">
                  {userB?.name || "未知用户"}
                </CardTitle>
                <CardDescription className="text-violet-400/70">
                  {userB?.expertise?.join(" · ") || "暂无专业领域"}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative pb-2">
          {/* 评分展示 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-300/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                互补性
              </span>
              <span className="text-violet-100 font-medium">
                {match.complementarity_score}
              </span>
            </div>
            <Progress
              value={match.complementarity_score}
              className="h-2 bg-violet-950/50"
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-300/70 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                未来生成性
              </span>
              <span className="text-violet-100 font-medium">
                {match.future_generativity}
              </span>
            </div>
            <Progress
              value={match.future_generativity}
              className="h-2 bg-violet-950/50"
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-300/70 flex items-center gap-1">
                <Users className="w-3 h-3" />
                综合评分
              </span>
              <span className="text-violet-100 font-bold">
                {match.overall_score}
              </span>
            </div>
            <Progress
              value={match.overall_score}
              className="h-2 bg-violet-900/50"
            />
          </div>

          {/* 关系类型 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-violet-300/70">关系类型:</span>
            <Badge
              variant="secondary"
              className="bg-violet-500/20 text-violet-300 border-violet-500/20"
            >
              {relationshipLabels[match.relationship_type] || match.relationship_type}
            </Badge>
          </div>

          {/* 互补领域 */}
          {match.complementarity_areas && match.complementarity_areas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.complementarity_areas.map((area) => (
                <span
                  key={area}
                  className="px-2 py-0.5 text-xs rounded-full bg-violet-500/10 text-violet-300/80 border border-violet-500/10"
                >
                  {area}
                </span>
              ))}
            </div>
          )}

          {/* 匹配原因 */}
          <p className="text-sm text-violet-300/60 mt-3 line-clamp-2">
            {match.match_reason}
          </p>

          {/* 接受后的流程引导 */}
          {match.status === "accepted" && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-300/80 mb-2">
                可以进入争鸣层，验证合作可行性
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="relative pt-2">
          <div className="flex items-center gap-2 w-full">
            {match.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
                  onClick={() => onAccept(match.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  接受
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
                  onClick={() => onDeclineClick(match.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-1" />
                  )}
                  婉拒
                </Button>
              </>
            ) : match.status === "accepted" ? (
              <Button
                asChild
                size="sm"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0"
              >
                <Link href={`/debates/${match.id}`}>
                  进入争鸣层
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
              >
                <Link href={`/matches/${match.id}`}>
                  查看详情
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// EmptyState 组件
// =============================================================================

function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, string> = {
    all: "暂无知遇卡",
    pending: "暂无待接受的知遇卡",
    accepted: "暂无已接受的知遇卡",
    declined: "暂无已婉拒的知遇卡",
  };

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
        {messages[filter]}
      </h3>
      <p className="text-violet-400/60 max-w-sm mx-auto">
        {filter === "all"
          ? "参与圆桌讨论，让AI发现与你互补的伙伴"
          : "去圆桌广场寻找更多机会吧"}
      </p>
      {filter !== "all" && (
        <Button
          asChild
          variant="outline"
          className="mt-4 border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
        >
          <Link href="/rounds">前往圆桌广场</Link>
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// 主页面组件
// =============================================================================

export default function MatchesPage() {
  const { user } = useSecondMeSession();
  const [activeTab, setActiveTab] = useState("all");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [declineDialog, setDeclineDialog] = useState<{ open: boolean; matchId: string | null }>({
    open: false,
    matchId: null,
  });

  // 接受匹配
  const handleAccept = async (matchId: string) => {
    try {
      setLoadingMatchId(matchId);
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.userId }),
      });
      const result = await response.json();

      if (result.success) {
        // 更新本地状态
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId ? { ...m, status: "accepted" as const } : m
          )
        );
      } else {
        setError(result.error?.message || "接受匹配失败");
      }
    } catch (err) {
      console.error("接受匹配失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoadingMatchId(null);
    }
  };

  // 婉拒匹配
  const handleDeclineClick = (matchId: string) => {
    setDeclineDialog({ open: true, matchId });
  };

  const handleDecline = async (matchId: string) => {
    setDeclineDialog({ open: false, matchId: null });
    try {
      setLoadingMatchId(matchId);
      const response = await fetch(`/api/matches/${matchId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.userId }),
      });
      const result = await response.json();

      if (result.success) {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
        toast.success("已婉拒此匹配", {
          description: "对方不会收到通知",
        });
      } else {
        setError(result.error?.message || "婉拒匹配失败");
        toast.error("操作失败", { description: result.error?.message });
      }
    } catch (err) {
      console.error("婉拒匹配失败:", err);
      setError("网络错误，请稍后重试");
      toast.error("网络错误", { description: "请检查网络连接后重试" });
    } finally {
      setLoadingMatchId(null);
    }
  };

  // 获取知遇卡列表
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/matches");
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setMatches(result.data);
      } else {
        setError(result.error?.message || "获取知遇卡失败");
        setMatches([]);
      }
    } catch (err) {
      console.error("获取知遇卡失败:", err);
      setError("网络错误，请稍后重试");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, fetchMatches]);

  // 筛选匹配
  const filteredMatches = matches.filter((match) => {
    if (activeTab === "all") return true;
    return match.status === activeTab;
  });

  // 统计
  const counts = {
    all: matches.length,
    pending: matches.filter((m) => m.status === "pending").length,
    accepted: matches.filter((m) => m.status === "accepted").length,
    declined: matches.filter((m) => m.status === "declined").length,
  };

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
              <Heart className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-violet-50 mb-4">
              知遇卡
            </h1>
            <p className="text-violet-300/60 mb-8">
              登录后查看你收到的知遇卡，发现与你互补的伙伴
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

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-serif font-bold text-violet-50 mb-2">
            知遇卡
          </h1>
          <p className="text-violet-300/60">
            在这里发现与你互补、能一起做成事的人
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
            <Button variant="outline" onClick={fetchMatches}>
              重试
            </Button>
          </div>
        )}

        {/* 筛选标签 */}
        {!loading && !error && (
          <>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-8"
            >
              <TabsList className="bg-violet-950/50 border border-violet-500/20">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  全部 ({counts.all})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  待接受 ({counts.pending})
                </TabsTrigger>
                <TabsTrigger
                  value="accepted"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  已接受 ({counts.accepted})
                </TabsTrigger>
                <TabsTrigger
                  value="declined"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  已婉拒 ({counts.declined})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <AnimatePresence mode="wait">
                  {filteredMatches.length > 0 ? (
                    <motion.div
                      key={activeTab}
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onDeclineClick={handleDeclineClick}
                            loadingMatchId={loadingMatchId}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <EmptyState filter={activeTab} />
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            <ConfirmDialog
              open={declineDialog.open}
              onOpenChange={(open) => setDeclineDialog({ open, matchId: declineDialog.matchId })}
              title="婉拒此匹配"
              description="确定要婉拒此知遇卡吗？婉拒后对方可以继续与其他用户匹配。"
              confirmText="婉拒"
              variant="warning"
              onConfirm={() => declineDialog.matchId && handleDecline(declineDialog.matchId)}
              isLoading={loadingMatchId !== null}
            />
          </>
        )}
      </div>
    </div>
  );
}
