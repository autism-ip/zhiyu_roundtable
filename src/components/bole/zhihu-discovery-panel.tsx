/**
 * [INPUT]: 依赖 zhihu/types 的 ZhihuBillboardItem 类型, ZhihuTopicCard, ApiStatusBadge
 * [OUTPUT]: 对外提供 ZhihuDiscoveryPanel 组件
 * [POS]: components/bole/zhihu-discovery-panel.tsx - 知乎发现面板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Loader2, RefreshCw, AlertCircle, Zap, Settings } from "lucide-react"
import { ZhihuTopicCard } from "./zhihu-topic-card"
import { ApiStatusBadge } from "./api-status-badge"
import { ZhihuBillboardItem } from "@/lib/zhihu/types"

interface ZhihuDiscoveryPanelProps {
  /** 同步回调 */
  onSync?: (topics: ZhihuBillboardItem[]) => void
  /** 同步完成回调 */
  onSyncComplete?: (result: SyncResult) => void
  /** 自定义类名 */
  className?: string
}

interface SyncResult {
  total: number
  created: number
  skipped: number
  errors: string[]
}

export function ZhihuDiscoveryPanel({
  onSync,
  onSyncComplete,
  className = "",
}: ZhihuDiscoveryPanelProps) {
  const [topics, setTopics] = useState<ZhihuBillboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingTopicId, setSyncingTopicId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  // 加载热榜预览
  const loadPreview = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/topics/zhihu-preview?topCnt=20")
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || "加载失败")
      }

      // 检查配置状态
      if (data.data?.configured === false) {
        setIsConfigured(false)
        setTopics([])
        return
      }

      setIsConfigured(true)
      setTopics(data.data?.topics || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
      setTopics([])
    } finally {
      setLoading(false)
    }
  }

  // 同步全部
  const handleSyncAll = async () => {
    if (!isConfigured) return

    try {
      setSyncing(true)
      setError(null)

      // 调用同步 API (GET 方法)
      const res = await fetch("/api/topics/zhihu-sync?topCnt=50")
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || "同步失败")
      }

      onSync?.(topics)
      onSyncComplete?.(data.data)

      // 重新加载预览
      await loadPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败")
    } finally {
      setSyncing(false)
    }
  }

  // 单个话题同步
  const handleSyncTopic = async (topic: ZhihuBillboardItem) => {
    try {
      setSyncingTopicId(topic.token)
      // TODO: 实现单个话题同步 API
      // 目前暂不支持单个同步，只是演示回调
      onSync?.([topic])
    } finally {
      setSyncingTopicId(null)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [])

  // 未配置状态
  if (isConfigured === false) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <h3 className="font-medium text-sm">知乎热榜</h3>
            <ApiStatusBadge />
          </div>
        </div>

        <Card
          variant="accent"
          className="bg-gradient-to-br from-violet-950/30 to-purple-900/10 border-violet-500/20"
        >
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 mb-4">
              <Settings className="w-6 h-6 text-violet-400" />
            </div>
            <h4 className="font-medium mb-2">知乎API未配置</h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              请在环境变量中设置 ZHIHU_APP_KEY 和 ZHIHU_APP_SECRET 以启用知乎热榜功能
            </p>
            <div className="bg-slate-900/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <code className="text-xs text-muted-foreground">
                <div className="mb-1">ZHIHU_APP_KEY=your_app_key</div>
                <div>ZHIHU_APP_SECRET=your_app_secret</div>
              </code>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // 加载状态
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <h3 className="font-medium text-sm">知乎热榜</h3>
            <ApiStatusBadge loading />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <h3 className="font-medium text-sm">知乎热榜</h3>
            <ApiStatusBadge />
          </div>
        </div>

        <Card variant="accent" className="bg-red-950/10 border-red-500/20">
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={loadPreview} className="mt-3">
              <RefreshCw className="w-4 h-4 mr-1" />
              重试
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 空状态
  if (topics.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <h3 className="font-medium text-sm">知乎热榜</h3>
            <ApiStatusBadge />
          </div>
        </div>

        <Card variant="accent" className="bg-slate-900/30 border-slate-800">
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">暂无热榜话题</p>
            <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              同步热榜
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 正常状态
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <h3 className="font-medium text-sm">知乎热榜</h3>
          <ApiStatusBadge />
          <span className="text-xs text-muted-foreground">共 {topics.length} 条</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncAll}
          disabled={syncing || !isConfigured}
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          同步全部
        </Button>
      </div>

      {/* 话题列表 */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.token}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <ZhihuTopicCard
              topic={topic}
              onSync={handleSyncTopic}
              syncing={syncingTopicId === topic.token}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
