/**
 * RoundCard 组件
 * [INPUT]: 依赖 @/components/ui/card 的 LayerCard、@/components/ui/avatar
 * [OUTPUT]: 提供圆桌卡片组件，带层级颜色标识
 * [POS]: components/bole/round-card.tsx - 伯乐层圆桌卡片
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayerCard } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Users, MessageSquare, Clock } from "lucide-react"

/* ============================================
 * 类型定义
 * ============================================ */
export interface RoundCardProps {
  id: string
  name: string
  description?: string
  topicTitle?: string
  status: "waiting" | "active" | "completed"
  participantCount: number
  maxParticipants: number
  layer?: "daiqing" | "zhuhong" | "jiangzi"
  createdAt: Date | string
  className?: string
}

/* ============================================
 * 状态配置
 * ============================================ */
const statusConfig = {
  waiting: { label: "等待中", color: "bg-[var(--ink-muted)]", textColor: "text-[var(--ink-muted)]" },
  active: { label: "进行中", color: "bg-[var(--success)]", textColor: "text-[var(--success)]" },
  completed: { label: "已结束", color: "bg-[var(--ink-muted)]/50", textColor: "text-[var(--ink-muted)]" },
}

/* ============================================
 * 格式化相对时间
 * ============================================ */
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

/* ============================================
 * RoundCard 组件
 * ============================================ */
export function RoundCard({
  id,
  name,
  description,
  topicTitle,
  status,
  participantCount,
  maxParticipants,
  layer = "daiqing",
  createdAt,
  className,
}: RoundCardProps) {
  const statusInfo = statusConfig[status]

  return (
    <Link href={`/rounds/${id}`} className="block">
      <LayerCard
        layer={layer}
        hoverable
        className={cn("h-full", className)}
      >
        {/* 卡片内容 */}
        <div className="p-5 space-y-4">
          {/* 头部：状态 + 话题 */}
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                statusInfo.textColor,
                status === "active" && "animate-pulse"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusInfo.color)} />
              {statusInfo.label}
            </Badge>
            {topicTitle && (
              <span className="text-xs text-[var(--ink-muted)] truncate max-w-[120px]">
                {topicTitle}
              </span>
            )}
          </div>

          {/* 标题 */}
          <h3 className="font-serif text-lg font-semibold text-[var(--ink)] line-clamp-2">
            {name}
          </h3>

          {/* 描述 */}
          {description && (
            <p className="text-sm text-[var(--ink-muted)] line-clamp-2">
              {description}
            </p>
          )}

          {/* 底部：参与人数 + 时间 */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-4 text-xs text-[var(--ink-muted)]">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {participantCount}/{maxParticipants}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeTime(createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* 层级颜色底部渐变装饰 */}
        <div
          className={cn(
            "h-1 w-full",
            layer === "daiqing" && "bg-gradient-to-r from-transparent via-[var(--daiqing)] to-transparent",
            layer === "zhuhong" && "bg-gradient-to-r from-transparent via-[var(--zhuhong)] to-transparent",
            layer === "jiangzi" && "bg-gradient-to-r from-transparent via-[var(--jiangzi)] to-transparent"
          )}
        />
      </LayerCard>
    </Link>
  )
}

/* ============================================
 * RoundCardSkeleton - 加载骨架
 * ============================================ */
export function RoundCardSkeleton() {
  return (
    <LayerCard layer="daiqing" className="h-full animate-pulse">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-16 bg-[var(--ink-muted)]/20 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-[var(--ink-muted)]/20 rounded" />
        <div className="h-4 w-full bg-[var(--ink-muted)]/20 rounded" />
        <div className="h-4 w-2/3 bg-[var(--ink-muted)]/20 rounded" />
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="h-4 w-20 bg-[var(--ink-muted)]/20 rounded" />
          <div className="h-4 w-16 bg-[var(--ink-muted)]/20 rounded" />
        </div>
      </div>
    </LayerCard>
  )
}

export { formatRelativeTime }
