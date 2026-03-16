/**
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 next-auth/react 的认证
 * [OUTPUT]: 对外提供圆桌列表页面
 * [POS]: app/rounds/page.tsx - 圆桌列表页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MessageCircle, Users, Clock, Search, Plus } from "lucide-react";

// 模拟数据
const mockRounds = [
  {
    id: "1",
    name: "AI 会不会让专业门槛失去意义？",
    description: "探讨 AI 时代专业技能的价值变化",
    topic: { title: "AI 与职业", category: "科技" },
    status: "ongoing",
    participantCount: 5,
    messageCount: 128,
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "2",
    name: "年轻人还应该创业吗？",
    description: "讨论创业环境和个人发展选择",
    topic: { title: "创业思考", category: "商业" },
    status: "waiting",
    participantCount: 3,
    messageCount: 0,
    createdAt: "2024-03-14T14:00:00Z",
  },
  {
    id: "3",
    name: "生物 AI 的隐私边界在哪里？",
    description: "探讨生物信息学与 AI 的伦理边界",
    topic: { title: "AI 伦理", category: "科技" },
    status: "completed",
    participantCount: 6,
    messageCount: 256,
    createdAt: "2024-03-08T09:00:00Z",
  },
];

export default function RoundsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRounds = mockRounds.filter(
    (round) =>
      round.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      round.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ongoingRounds = filteredRounds.filter((r) => r.status === "ongoing");
  const waitingRounds = filteredRounds.filter((r) => r.status === "waiting");
  const completedRounds = filteredRounds.filter((r) => r.status === "completed");

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

  const RoundCard = ({ round }: { round: typeof mockRounds[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{round.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {round.description}
            </CardDescription>
          </div>
          <div className="ml-4">{getStatusBadge(round.status)}</div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{round.participantCount} 人参与</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            <span>{round.messageCount} 条讨论</span>
          </div>
        </div>
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
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="space-y-6">
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
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredRounds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无符合条件的圆桌</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4">
          {ongoingRounds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ongoingRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无进行中的圆桌</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="waiting" className="space-y-4">
          {waitingRounds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {waitingRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无等待中的圆桌</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRounds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无已完成的圆桌</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
