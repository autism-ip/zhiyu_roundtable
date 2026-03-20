/**
 * 知乎热榜话题选择组件
 * [INPUT]: 依赖 fetch, useState, useEffect, framer-motion, lucide-react
 * [OUTPUT]: 对外提供 ZhihuTopicSelector 组件
 * [POS]: components/bole/zhihu-topic-selector.tsx - 热榜话题选择器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, TrendingUp, RefreshCw, ExternalLink } from "lucide-react"

interface ZhihuTopic {
  id?: string
  title: string
  description?: string
  category: string
  zhihu_id: string
  zhihu_url: string
  heat_score: number
}

interface ZhihuTopicSelectorProps {
  value?: string
  onChange: (topic: ZhihuTopic) => void
}

export function ZhihuTopicSelector({ value, onChange }: ZhihuTopicSelectorProps) {
  const [topics, setTopics] = useState<ZhihuTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // 加载热榜话题
  const loadTopics = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/topics?source=zhihu_billboard')
      const data = await res.json()

      if (data.success && data.data) {
        setTopics(data.data)
        setLastSync(new Date())
      }
    } catch (error) {
      console.error('加载热榜失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 同步热榜
  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/topics/zhihu-sync?topCnt=50')
      const data = await res.json()

      if (data.success) {
        await loadTopics()
      }
    } catch (error) {
      console.error('同步失败:', error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadTopics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span>来自知乎热榜</span>
          {lastSync && (
            <span>• 已更新 {lastSync.toLocaleTimeString()}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          同步
        </Button>
      </div>

      {topics.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>暂无热榜话题</p>
          <Button variant="link" onClick={handleSync}>
            点击同步
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {topics.map((topic, index) => (
            <motion.div
              key={topic.zhihu_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onChange(topic)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                value === topic.zhihu_id
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm line-clamp-1">{topic.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {topic.category}
                    </Badge>
                  </div>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {(topic.heat_score ?? 0).toLocaleString()}
                  </Badge>
                  <a
                    href={topic.zhihu_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-1 hover:bg-slate-800 rounded"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
