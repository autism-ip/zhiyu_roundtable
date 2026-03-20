/**
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session 的认证
 * [OUTPUT]: 对外提供圆桌列表页面
 * [POS]: app/rounds/page.tsx - 圆桌列表页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Users, Clock, Search, Plus, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

// =============================================================================
// 类型定义
// =============================================================================

interface Round {
  id: string;
  name: string;
  description: string | null;
  status: string;
  max_agents: number;
  topic_id: string;
  created_at: string;
  topic?: {
    title: string;
    category: string;
  };
  participantCount?: number;
  messageCount?: number;
}

interface ApiResponse {
  success: boolean;
  data?: Round[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// 辅助函数
// =============================================================================

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ongoing":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          进行中
        </Badge>
      );
    case "waiting":
      return (
        <Badge variant="secondary">
          等待中
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline">
          已完成
        </Badge>
      );
    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =============================================================================
// RoundCard 组件
// =============================================================================

const RoundCard = ({ round }: { round: Round }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg line-clamp-1">{round.name}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {round.description || "暂无描述"}
          </CardDescription>
        </div>
        <div className="ml-4">{getStatusBadge(round.status)}</div>
      </div>
    </CardHeader>
    <CardContent className="pb-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{round.participantCount || 0} 人参与</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" />
          <span>{round.messageCount || 0} 条讨论</span>
        </div>
      </div>
      {round.topic && (
        <div className="mt-2">
          <Badge variant="outline">{round.topic.title}</Badge>
        </div>
      )}
    </CardContent>
    <CardFooter className="pt-0">
      <Button asChild variant="outline" className="w-full">
        <Link href={`/rounds/${round.id}`}>
          {round.status === "ongoing" ? "进入圆桌" : "查看详情"}
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

// =============================================================================
// 主页面组件
// =============================================================================

export default function RoundsPage() {
  const { user } = useSecondMeSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [myRoundsTab, setMyRoundsTab] = useState<"created" | "joined">("created");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [myCreatedRounds, setMyCreatedRounds] = useState<Round[]>([]);
  const [myJoinedRounds, setMyJoinedRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myError, setMyError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 搜索防抖
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 300);
  };

  // 获取圆桌列表
  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("status", activeTab);
      }

      const response = await fetch(`/api/rounds?${params.toString()}`);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setRounds(result.data);
      } else {
        setError(result.error?.message || "获取圆桌列表失败");
        setRounds([]);
      }
    } catch (err) {
      console.error("获取圆桌列表失败:", err);
      setError("网络错误，请稍后重试");
      setRounds([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // 获取我创建的圆桌
  const fetchMyCreatedRounds = useCallback(async () => {
    if (!user) return;
    try {
      setMyLoading(true);
      setMyError(null);
      const response = await fetch("/api/rounds?myCreated=true");
      const result: ApiResponse = await response.json();
      if (result.success && result.data) {
        setMyCreatedRounds(result.data);
      } else {
        setMyError(result.error?.message || "获取我创建的圆桌失败");
      }
    } catch (err) {
      console.error("获取我创建的圆桌失败:", err);
      setMyError("网络错误，请稍后重试");
    } finally {
      setMyLoading(false);
    }
  }, [user]);

  // 获取我加入的圆桌
  const fetchMyJoinedRounds = useCallback(async () => {
    if (!user) return;
    try {
      setMyLoading(true);
      setMyError(null);
      const response = await fetch("/api/rounds?myJoined=true");
      const result: ApiResponse = await response.json();
      if (result.success && result.data) {
        setMyJoinedRounds(result.data);
      } else {
        setMyError(result.error?.message || "获取我加入的圆桌失败");
      }
    } catch (err) {
      console.error("获取我加入的圆桌失败:", err);
      setMyError("网络错误，请稍后重试");
    } finally {
      setMyLoading(false);
    }
  }, [user]);

  // 当切换到"我的圆桌"标签时获取数据
  useEffect(() => {
    if (activeTab === "my") {
      fetchMyCreatedRounds();
      fetchMyJoinedRounds();
    }
  }, [activeTab, fetchMyCreatedRounds, fetchMyJoinedRounds]);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 搜索过滤（使用防抖后的搜索词）
  const filteredRounds = rounds.filter(
    (round) =>
      round.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (round.description && round.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
  );

  const ongoingRounds = filteredRounds.filter((r) => r.status === "ongoing");
  const waitingRounds = filteredRounds.filter((r) => r.status === "waiting");
  const completedRounds = filteredRounds.filter((r) => r.status === "completed");

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">圆桌广场</h1>
          <p className="text-muted-foreground mt-1">
            加入感兴趣的圆桌讨论，发现志同道合的人
          </p>
        </div>
        <Button asChild>
          <Link href="/rounds/create">
            <Plus className="mr-2 h-4 w-4" />
            创建圆桌
          </Link>
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索圆桌..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            全部 ({filteredRounds.length})
          </TabsTrigger>
          <TabsTrigger value="ongoing">
            进行中 ({ongoingRounds.length})
          </TabsTrigger>
          <TabsTrigger value="waiting">
            等待中 ({waitingRounds.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            已完成 ({completedRounds.length})
          </TabsTrigger>
          {user && (
            <TabsTrigger value="my">
              我的圆桌 ({myCreatedRounds.length + myJoinedRounds.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* 加载状态 - 骨架屏 */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-6 w-16 ml-4" />
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </CardContent>
                <CardFooter className="pt-0">
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={fetchRounds} className="mt-4">
              重试
            </Button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && filteredRounds.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="暂无圆桌"
            description="还没有圆桌，快来创建第一个吧"
            actionLabel="创建圆桌"
            actionHref="/rounds/create"
          />
        )}

        <TabsContent value="all" className="space-y-4" key="all">
          {!loading && !error && filteredRounds.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4" key="ongoing">
          {!loading && !error && ongoingRounds.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ongoingRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="waiting" className="space-y-4" key="waiting">
          {!loading && !error && waitingRounds.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {waitingRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4" key="completed">
          {!loading && !error && completedRounds.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 我的圆桌 - 嵌套标签页 */}
        <TabsContent value="my" className="space-y-4" key="my">
          {user ? (
            <>
              <Tabs value={myRoundsTab} onValueChange={(v) => setMyRoundsTab(v as "created" | "joined")} className="mt-4">
                <TabsList>
                  <TabsTrigger value="created">
                    创建的 ({myCreatedRounds.length})
                  </TabsTrigger>
                  <TabsTrigger value="joined">
                    加入的 ({myJoinedRounds.length})
                  </TabsTrigger>
                </TabsList>

                {/* 加载状态 */}
                {myLoading && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                            <Skeleton className="h-6 w-16 ml-4" />
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3 space-y-2">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="h-5 w-24" />
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Skeleton className="h-10 w-full" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}

                {/* 错误状态 */}
                {myError && !myLoading && (
                  <div className="text-center py-12">
                    <p className="text-red-500">{myError}</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchMyCreatedRounds();
                        fetchMyJoinedRounds();
                      }}
                      className="mt-4"
                    >
                      重试
                    </Button>
                  </div>
                )}

                {/* 创建的圆桌 */}
                <TabsContent value="created" className="space-y-4 mt-4">
                  {!myLoading && !myError && myCreatedRounds.length === 0 && (
                    <EmptyState
                      icon={Plus}
                      title="你还没有创建圆桌"
                      description="创建一个圆桌，开始你的发现之旅"
                      actionLabel="创建圆桌"
                      actionHref="/rounds/create"
                    />
                  )}
                  {!myLoading && !myError && myCreatedRounds.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {myCreatedRounds.map((round) => (
                        <RoundCard key={round.id} round={round} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* 加入的圆桌 */}
                <TabsContent value="joined" className="space-y-4 mt-4">
                  {!myLoading && !myError && myJoinedRounds.length === 0 && (
                    <EmptyState
                      icon={Users}
                      title="你还没有加入任何圆桌"
                      description="去圆桌广场探索，找到感兴趣的讨论"
                      actionLabel="探索圆桌"
                      actionHref="/rounds"
                    />
                  )}
                  {!myLoading && !myError && myJoinedRounds.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {myJoinedRounds.map((round) => (
                        <RoundCard key={round.id} round={round} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">请先登录查看我的圆桌</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
