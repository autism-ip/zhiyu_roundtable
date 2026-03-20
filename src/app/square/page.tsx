/**
 * 社区广场页面
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供社区广场页面
 * [POS]: app/square/page.tsx - 内容发现入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Sparkles,
  TrendingUp,
  Loader2,
  Heart,
  MessageCircle,
  Award,
  ArrowRight,
} from "lucide-react";

// =============================================================================
// 类型定义
// =============================================================================

interface Round {
  id: string;
  name: string;
  description: string | null;
  topic?: { title: string };
  participant_count: number;
  status: string;
  created_at: string;
}

interface Match {
  id: string;
  user_a?: { name: string; avatar: string | null };
  user_b?: { name: string; avatar: string | null };
  overall_score: number;
  relationship_type: string;
  match_reason: string;
}

interface SuccessCase {
  id: string;
  title: string;
  description: string;
  participants: Array<{ name: string; avatar: string | null }>;
  outcome: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 常量
// =============================================================================

const relationshipLabels: Record<string, string> = {
  cofounder: "共创搭子",
  peer: "同道",
  opponent: "对手",
  advisor: "顾问",
  mentee: "学徒",
  none: "暂不建议",
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
// RoundCard 组件
// =============================================================================

function RoundCard({ round }: { round: Round }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-gradient-to-br from-blue-950/30 to-cyan-900/10 border-blue-500/20 hover:border-blue-500/40 transition-all h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-blue-100 mb-1">
                {round.name}
              </CardTitle>
              {round.topic && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 mb-2">
                  {round.topic.title}
                </Badge>
              )}
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              {round.status === "active" ? "进行中" : round.status}
            </Badge>
          </div>
          <CardDescription className="text-blue-300/60 line-clamp-2">
            {round.description || "暂无描述"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-300/60 text-sm">
              <Users className="w-4 h-4" />
              <span>{round.participant_count} 人参与</span>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0"
            >
              <Link href={`/rounds/${round.id}`}>
                加入
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// MatchCard 组件
// =============================================================================

function MatchCard({ match }: { match: Match }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-gradient-to-br from-purple-950/30 to-pink-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all h-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-2">
              {[match.user_a, match.user_b].map((user, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-purple-900/50 border-2 border-purple-500/30 flex items-center justify-center"
                >
                  <span className="text-xs text-purple-200">
                    {user?.name?.[0] || "?"}
                  </span>
                </div>
              ))}
            </div>
            <Badge
              variant="outline"
              className="bg-purple-500/10 text-purple-300 border-purple-500/20"
            >
              {relationshipLabels[match.relationship_type] || match.relationship_type}
            </Badge>
          </div>
          <CardTitle className="text-lg text-purple-100">
            {match.user_a?.name} & {match.user_b?.name}
          </CardTitle>
          <CardDescription className="text-purple-300/60 line-clamp-2">
            {match.match_reason}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300/60 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>评分 {match.overall_score}</span>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
            >
              <Link href={`/matches/${match.id}`}>
                查看详情
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// SuccessCaseCard 组件
// =============================================================================

function SuccessCaseCard({ successCase }: { successCase: SuccessCase }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-gradient-to-br from-amber-950/30 to-orange-900/10 border-amber-500/20 hover:border-amber-500/40 transition-all h-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-400" />
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              {successCase.outcome}
            </Badge>
          </div>
          <CardTitle className="text-lg text-amber-100">
            {successCase.title}
          </CardTitle>
          <CardDescription className="text-amber-300/60 line-clamp-3">
            {successCase.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {successCase.participants.map((p, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-amber-900/50 border-2 border-amber-500/30 flex items-center justify-center"
                >
                  <span className="text-xs text-amber-200">{p.name[0]}</span>
                </div>
              ))}
            </div>
            <span className="text-amber-300/60 text-sm">
              {successCase.participants.map(p => p.name).join(", ")}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// 主页面组件
// =============================================================================

export default function SquarePage() {
  const { user } = useSecondMeSession();
  const [activeTab, setActiveTab] = useState("rounds");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [successCases, setSuccessCases] = useState<SuccessCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行获取三个数据集
      const [roundsRes, matchesRes, casesRes] = await Promise.all([
        fetch("/api/rounds"),
        fetch("/api/matches/featured"),
        fetch("/api/success-cases"),
      ]);

      const [roundsData, matchesData, casesData] = await Promise.all([
        roundsRes.json() as Promise<ApiResponse<Round[]>>,
        matchesRes.json() as Promise<ApiResponse<Match[]>>,
        casesRes.json() as Promise<ApiResponse<SuccessCase[]>>,
      ]);

      if (roundsData.success && roundsData.data) {
        setRounds(roundsData.data);
      }
      if (matchesData.success && matchesData.data) {
        setMatches(matchesData.data);
      }
      if (casesData.success && casesData.data) {
        setSuccessCases(casesData.data);
      }
    } catch (err) {
      console.error("获取广场数据失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

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
              <Users className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-violet-50 mb-4">
              社区广场
            </h1>
            <p className="text-violet-300/60 mb-8">
              探索活跃圆桌、发现优质知遇卡、了解成功案例
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
        {/* noise texture - 使用 CSS 生成代替不存在的图片 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-serif font-bold text-violet-50 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            社区广场
          </h1>
          <p className="text-violet-300/60">
            探索活跃圆桌、发现优质知遇卡、了解成功案例
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
            <Button variant="outline" onClick={fetchData}>
              重试
            </Button>
          </div>
        )}

        {/* 内容区域 */}
        {!loading && !error && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-violet-950/50 border border-violet-500/20 mb-6">
              <TabsTrigger
                value="rounds"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                活跃圆桌
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              >
                <Heart className="w-4 h-4 mr-2" />
                推荐知遇卡
              </TabsTrigger>
              <TabsTrigger
                value="cases"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              >
                <Award className="w-4 h-4 mr-2" />
                成功案例
              </TabsTrigger>
            </TabsList>

            {/* 活跃圆桌 */}
            <TabsContent value="rounds">
              <AnimatePresence mode="wait">
                {rounds.length > 0 ? (
                  <motion.div
                    key="rounds"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {rounds.map((round) => (
                        <RoundCard key={round.id} round={round} />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <p className="text-violet-400/60">暂无活跃圆桌</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/rounds/create">创建圆桌</Link>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* 推荐知遇卡 */}
            <TabsContent value="matches">
              <AnimatePresence mode="wait">
                {matches.length > 0 ? (
                  <motion.div
                    key="matches"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {matches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <p className="text-violet-400/60">暂无推荐知遇卡</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/rounds">参与圆桌</Link>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* 成功案例 */}
            <TabsContent value="cases">
              <AnimatePresence mode="wait">
                {successCases.length > 0 ? (
                  <motion.div
                    key="cases"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {successCases.map((c) => (
                        <SuccessCaseCard key={c.id} successCase={c} />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <p className="text-violet-400/60">暂无成功案例</p>
                    <p className="text-violet-400/40 text-sm mt-2">
                      第一个成功案例等你来创造
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
