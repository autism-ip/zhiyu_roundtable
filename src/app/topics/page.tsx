/**
 * [INPUT]: 依赖 ZhihuTopicSelector, 话题相关组件
 * [OUTPUT]: 对外提供话题管理页面
 * [POS]: app/topics/page.tsx - 话题管理页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { ZhihuTopicSelector } from "@/components/bole/zhihu-topic-selector";
import { Search, Plus, Tag, TrendingUp, Loader2, Sparkles, ExternalLink } from "lucide-react";

// =============================================================================
// 类型定义
// =============================================================================

interface Topic {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  zhihuId: string | null;
  zhihuUrl: string | null;
  source: string | null;
  heatScore: number | null;
  status: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data?: Topic[];
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =============================================================================
// TopicCard 组件
// =============================================================================

const TopicCard = ({ topic }: { topic: Topic }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg line-clamp-1">{topic.title}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {topic.description || "暂无描述"}
          </CardDescription>
        </div>
        {topic.source === "zhihu_billboard" && (
          <Badge variant="outline" className="ml-4 text-amber-400 border-amber-400/30">
            <TrendingUp className="h-3 w-3 mr-1" />
            知乎热榜
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent className="pb-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {topic.category && (
          <div className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            <span>{topic.category}</span>
          </div>
        )}
        {topic.heatScore && (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{topic.heatScore.toLocaleString()}</span>
          </div>
        )}
        <span>{formatDate(topic.createdAt)}</span>
      </div>
      {topic.tags && topic.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {topic.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </CardContent>
    <CardContent className="pt-0 pb-3">
      {topic.zhihuUrl && (
        <a
          href={topic.zhihuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          查看原话题
        </a>
      )}
    </CardContent>
  </Card>
);

// =============================================================================
// 主页面组件
// =============================================================================

export default function TopicsPage() {
  const { user } = useSecondMeSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [createTopicError, setCreateTopicError] = useState<string | null>(null);
  const [createTopicForm, setCreateTopicForm] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
  });
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

  // 获取话题列表
  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const response = await fetch(`/api/topics?${params.toString()}`);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setTopics(result.data);
      } else {
        setError(result.error?.message || "获取话题列表失败");
        setTopics([]);
      }
    } catch (err) {
      console.error("获取话题列表失败:", err);
      setError("网络错误，请稍后重试");
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "all" || activeTab === "custom") {
      fetchTopics();
    }
  }, [activeTab, fetchTopics]);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 创建议题表单变化
  const handleCreateTopicChange = (field: string, value: string) => {
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

  // 知乎热榜话题处理
  const handleZhihuTopicSelect = async (zhihuTopic: any) => {
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: zhihuTopic.title,
          description: zhihuTopic.description || undefined,
          category: zhihuTopic.category,
          zhihuId: zhihuTopic.zhihu_id,
          zhihuUrl: zhihuTopic.zhihu_url,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setTopics((prev) => [...prev, data.data]);
        setActiveTab("all");
      }
    } catch (err) {
      console.error("导入热榜话题失败:", err);
    }
  };

  // 搜索过滤
  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (topic.description && topic.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      (topic.category && topic.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
  );

  const allTopics = filteredTopics;
  const zhihuTopics = filteredTopics.filter((t) => t.source === "zhihu_billboard");
  const customTopics = filteredTopics.filter((t) => t.source !== "zhihu_billboard");

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">话题广场</h1>
          <p className="text-muted-foreground mt-1">
            发现精彩话题，参与深度讨论
          </p>
        </div>
        <Button onClick={() => setShowCreateTopic(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建议题
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索话题..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            全部 ({allTopics.length})
          </TabsTrigger>
          <TabsTrigger value="zhihu">
            知乎热榜 ({zhihuTopics.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            自定义 ({customTopics.length})
          </TabsTrigger>
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
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={fetchTopics} className="mt-4">
              重试
            </Button>
          </div>
        )}

        {/* 空状态 - 全部 */}
        {!loading && !error && activeTab === "all" && allTopics.length === 0 && (
          <EmptyState
            icon={Tag}
            title="暂无话题"
            description="还没有话题，快来创建第一个吧"
            actionLabel="创建议题"
            actionOnClick={() => setShowCreateTopic(true)}
          />
        )}

        {/* 空状态 - 知乎热榜 */}
        {!loading && !error && activeTab === "zhihu" && zhihuTopics.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title="暂无热榜话题"
            description="同步知乎热榜，发现热门讨论"
          />
        )}

        {/* 空状态 - 自定义 */}
        {!loading && !error && activeTab === "custom" && customTopics.length === 0 && (
          <EmptyState
            icon={Plus}
            title="暂无自定义话题"
            description="创建专属话题，发起深度讨论"
            actionLabel="创建议题"
            actionOnClick={() => setShowCreateTopic(true)}
          />
        )}

        <TabsContent value="all" className="space-y-4" key="all">
          {!loading && !error && allTopics.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="zhihu" className="space-y-4" key="zhihu">
          {!loading && !error && zhihuTopics.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {zhihuTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}
          {!loading && !error && zhihuTopics.length === 0 && (
            <ZhihuTopicSelector
              onChange={handleZhihuTopicSelect}
            />
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4" key="custom">
          {!loading && !error && customTopics.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
  );
}
