/**
 * [INPUT]: 依赖 zhihu/types 的 ZhihuBillboardItem 类型
 * [OUTPUT]: 对外提供 ZhihuTopicCard 组件
 * [POS]: components/bole/zhihu-topic-card.tsx - 知乎话题卡片
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ExternalLink, TrendingUp, RefreshCw, CheckCircle } from "lucide-react"
import { ZhihuBillboardItem } from "@/lib/zhihu/types"

interface ZhihuTopicCardProps {
  /** 话题数据 */
  topic: ZhihuBillboardItem
  /** 选中状态 */
  selected?: boolean
  /** 选中回调 */
  onSelect?: (topic: ZhihuBillboardItem) => void
  /** 同步回调 */
  onSync?: (topic: ZhihuBillboardItem) => void
  /** 同步中状态 */
  syncing?: boolean
  /** 自定义类名 */
  className?: string
}

export const ZhihuTopicCard = memo(function ZhihuTopicCard({
  topic,
  selected = false,
  onSelect,
  onSync,
  syncing = false,
  className = "",
}: ZhihuTopicCardProps) {
  // 推断分类
  const category = inferCategory(topic.title, topic.body)

  // 截断描述
  const truncatedBody = topic.body.length > 150 ? topic.body.slice(0, 150) + "..." : topic.body

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        variant="accent"
        hoverable
        onClick={() => onSelect?.(topic)}
        className={`
          relative overflow-hidden cursor-pointer transition-all duration-300
          ${selected ? "bg-violet-500/10 border-violet-500/40" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"}
          ${className}
        `}
      >
        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/50 to-purple-500/50" />

        <div className="p-4 pt-5">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-medium text-sm leading-snug line-clamp-2 flex-1">{topic.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {selected && <CheckCircle className="w-4 h-4 text-violet-400" />}
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            </div>
          </div>

          {/* 描述 */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{truncatedBody}</p>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between gap-2">
            {/* 热度分数 */}
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="text-amber-400 border-amber-400/30 bg-amber-400/5"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {topic.heat_score.toLocaleString()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {topic.published_time_str}
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1">
              {/* 同步按钮 */}
              {onSync && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSync(topic)
                  }}
                  disabled={syncing}
                  className="h-7 px-2 text-xs gap-1"
                >
                  {syncing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  同步
                </Button>
              )}

              {/* 知乎链接 */}
              <a
                href={topic.link_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-slate-800 transition-colors"
                title="查看知乎原文"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
})

// 推断分类映射 - 模块级别常量，避免重复创建
const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  "科技": ["ai", "人工智能", "chatgpt", "大模型", "技术", "编程", "软件", "自动驾驶", "特斯拉", "科技", "手机", "电脑", "互联网"],
  "商业": ["创业", "商业", "投资", "公司", "融资", "市场", "经济", "股票", "理财"],
  "社会": ["社会", "教育", "职场", "工作", "生活", "家庭", "大学", "高考", "就业"],
  "娱乐": ["电影", "电视剧", "明星", "综艺", "音乐", "游戏", "演员", "导演"],
  "文化": ["历史", "文化", "文学", "哲学", "思想", "书籍", "阅读", "艺术"],
} as const

/**
 * 从标题和内容推断分类
 */
function inferCategory(title: string, body: string): string {
  const text = `${title} ${body}`.toLowerCase()

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) {
      return cat
    }
  }

  return "其他"
}
