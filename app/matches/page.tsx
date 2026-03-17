/**
 * 知遇卡列表页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react
 * [OUTPUT]: 对外提供知遇卡列表页面
 * [POS]: app/matches/page.tsx - 知遇卡列表页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
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
import {
  Sparkles,
  Heart,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Users,
  Lightbulb,
} from "lucide-react";

// 模拟数据
const mockMatches = [
  {
    id: "match-1",
    userA: {
      id: "user-1",
      name: "张三",
      avatar: null,
      expertise: ["AI", "产品"],
    },
    userB: {
      id: "user-2",
      name: "李四",
      avatar: null,
      expertise: ["后端", "架构"],
    },
    complementarityScore: 85,
    futureGenerativityScore: 78,
    overallScore: 82,
    relationshipType: "cofounder",
    matchReason: "在AI产品设计方面有很强的互补性",
    complementarityAreas: ["AI产品思维", "系统架构"],
    status: "pending" as const,
    createdAt: new Date("2024-03-10"),
  },
  {
    id: "match-2",
    userA: {
      id: "user-1",
      name: "张三",
      avatar: null,
      expertise: ["AI", "产品"],
    },
    userB: {
      id: "user-3",
      name: "王五",
      avatar: null,
      expertise: ["UI/UX", "品牌"],
    },
    complementarityScore: 72,
    futureGenerativityScore: 65,
    overallScore: 69,
    relationshipType: "peer",
    matchReason: "都关注用户体验设计",
    complementarityAreas: ["用户体验", "视觉设计"],
    status: "accepted" as const,
    createdAt: new Date("2024-03-08"),
  },
  {
    id: "match-3",
    userA: {
      id: "user-1",
      name: "张三",
      avatar: null,
      expertise: ["AI", "产品"],
    },
    userB: {
      id: "user-4",
      name: "赵六",
      avatar: null,
      expertise: ["营销", "增长"],
    },
    complementarityScore: 55,
    futureGenerativityScore: 50,
    overallScore: 53,
    relationshipType: "none",
    matchReason: "领域差异较大",
    complementarityAreas: [],
    status: "declined" as const,
    createdAt: new Date("2024-03-05"),
  },
];

// 关系类型映射
const relationshipLabels: Record<string, string> = {
  cofounder: "共创搭子",
  peer: "同道",
  opponent: "对手",
  advisor: "顾问",
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

// 知遇卡组件
function MatchCard({ match }: { match: typeof mockMatches[0] }) {
  const statusKey = match.status as keyof typeof statusConfig;
  const status = statusConfig[statusKey] || statusConfig.pending;

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
                <AvatarImage src={match.userB.avatar || undefined} />
                <AvatarFallback className="bg-violet-900/30 text-violet-200">
                  {match.userB.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg text-violet-100">
                  {match.userB.name}
                </CardTitle>
                <CardDescription className="text-violet-400/70">
                  {match.userB.expertise.join(" · ")}
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
                {match.complementarityScore}
              </span>
            </div>
            <Progress
              value={match.complementarityScore}
              className="h-2 bg-violet-950/50"
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-300/70 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                未来生成性
              </span>
              <span className="text-violet-100 font-medium">
                {match.futureGenerativityScore}
              </span>
            </div>
            <Progress
              value={match.futureGenerativityScore}
              className="h-2 bg-violet-950/50"
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-300/70 flex items-center gap-1">
                <Users className="w-3 h-3" />
                综合评分
              </span>
              <span className="text-violet-100 font-bold">
                {match.overallScore}
              </span>
            </div>
            <Progress
              value={match.overallScore}
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
              {relationshipLabels[match.relationshipType]}
            </Badge>
          </div>

          {/* 互补领域 */}
          {match.complementarityAreas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.complementarityAreas.map((area) => (
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
            {match.matchReason}
          </p>
        </CardContent>

        <CardFooter className="relative pt-2">
          <div className="flex items-center gap-2 w-full">
            {match.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {status.action}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  婉拒
                </Button>
              </>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
              >
                <Link href={`/matches/${match.id}`}>
                  {status.action}
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

// 空状态组件
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

export default function MatchesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("all");

  // 筛选匹配
  const filteredMatches = mockMatches.filter((match) => {
    if (activeTab === "all") return true;
    return match.status === activeTab;
  });

  // 统计
  const counts = {
    all: mockMatches.length,
    pending: mockMatches.filter((m) => m.status === "pending").length,
    accepted: mockMatches.filter((m) => m.status === "accepted").length,
    declined: mockMatches.filter((m) => m.status === "declined").length,
  };

  if (!session) {
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

        {/* 筛选标签 */}
        <Tabs
          defaultValue="all"
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
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <EmptyState filter={activeTab} />
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
