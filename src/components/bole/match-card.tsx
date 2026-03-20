/**
 * MatchCard 组件
 * [INPUT]: 依赖 @/components/ui/card、@/components/ui/progress、@/components/ui/avatar
 * [OUTPUT]: 提供知遇卡组件，带评分进度条
 * [POS]: components/bole/match-card.tsx - 伯乐层知遇卡组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sparkles, ArrowRight, User, Users } from "lucide-react"

/* ============================================
 * 类型定义
 * ============================================ */
export interface MatchCardProps {
  id: string
  userA: {
    name: string
    avatar?: string
    expertise?: string[]
  }
  userB: {
    name: string
    avatar?: string
    expertise?: string[]
  }
  complementarityScore: number
  futureGenerativity: number
  overallScore: number
  relationshipType: string
  matchReason: string
  complementarityAreas: string[]
  status: "pending" | "accepted" | "declined" | "expired"
  createdAt: Date | string
  className?: string
}

/* ============================================
 * 关系类型配置
 * ============================================ */
const relationshipConfig: Record<string, { label: string; color: string }> = {
  peer: { label: "同伴", color: "bg-[var(--ink-muted)]" },
  cofounder: { label: "联合创始人", color: "bg-[var(--gold)]" },
  opponent: { label: "对手", color: "bg-[var(--zhuhong)]" },
  advisor: { label: "导师", color: "bg-[var(--daiqing)]" },
  mentee: { label: "学徒", color: "bg-[var(--jiangzi)]" },
  none: { label: "无匹配", color: "bg-[var(--ink-muted)]" },
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
 * MatchCard 组件
 * ============================================ */
export function MatchCard({
  id,
  userA,
  userB,
  complementarityScore,
  futureGenerativity,
  overallScore,
  relationshipType,
  matchReason,
  complementarityAreas,
  status,
  createdAt,
  className,
}: MatchCardProps) {
  const relConfig = relationshipConfig[relationshipType] || relationshipConfig.none
  const isPending = status === "pending"

  return (
    <Card
      variant="elevated"
      hoverable={!isPending}
      className={cn(
        "relative overflow-hidden",
        "border-l-4 border-l-[var(--gold)]",
        className
      )}
    >
      {/* 顶部金色光条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-60" />

      <CardContent className="pt-6">
        {/* 头部：关系类型 + 状态 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-white border-none",
                relConfig.color
              )}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {relConfig.label}
            </Badge>
          </div>
          <span className="text-xs text-[var(--ink-muted)]">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {/* 用户对 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* 用户 A */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-14 h-14 border-2 border-[var(--gold)]">
              {userA.avatar && <AvatarImage src={userA.avatar} alt={userA.name} />}
              <AvatarFallback className="bg-[var(--paper)] text-[var(--ink)]">
                {userA.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-[var(--ink)]">{userA.name}</span>
            {userA.expertise && userA.expertise.length > 0 && (
              <span className="text-xs text-[var(--ink-muted)]">
                {userA.expertise.slice(0, 2).join(", ")}
              </span>
            )}
          </div>

          {/* 连接符 */}
          <div className="flex flex-col items-center">
            <Users className="w-5 h-5 text-[var(--gold)]" />
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent mt-1" />
          </div>

          {/* 用户 B */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-14 h-14 border-2 border-[var(--gold)]">
              {userB.avatar && <AvatarImage src={userB.avatar} alt={userB.name} />}
              <AvatarFallback className="bg-[var(--paper)] text-[var(--ink)]">
                {userB.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-[var(--ink)]">{userB.name}</span>
            {userB.expertise && userB.expertise.length > 0 && (
              <span className="text-xs text-[var(--ink-muted)]">
                {userB.expertise.slice(0, 2).join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* 评分区域 */}
        <div className="space-y-3 mb-4">
          {/* 综合评分 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--ink-muted)]">综合评分</span>
            <span className="text-lg font-semibold text-[var(--gold)]">
              {Math.round(overallScore)}分
            </span>
          </div>
          <Progress
            value={overallScore}
            className="h-2 bg-[var(--fabric)]"
          />

          {/* 互补性 + 未来生成性 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--ink-muted)]">互补性</span>
                <span className="text-sm font-medium text-[var(--ink)]">
                  {Math.round(complementarityScore)}分
                </span>
              </div>
              <Progress
                value={complementarityScore}
                className="h-1.5 bg-[var(--fabric)]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--ink-muted)]">未来生成性</span>
                <span className="text-sm font-medium text-[var(--ink)]">
                  {Math.round(futureGenerativity)}分
                </span>
              </div>
              <Progress
                value={futureGenerativity}
                className="h-1.5 bg-[var(--fabric)]"
              />
            </div>
          </div>
        </div>

        {/* 匹配理由 */}
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-light)] leading-relaxed">
            {matchReason}
          </p>
        </div>

        {/* 互补领域标签 */}
        {complementarityAreas && complementarityAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {complementarityAreas.slice(0, 3).map((area, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs border-[var(--gold)]/30 text-[var(--gold)]"
              >
                {area}
              </Badge>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        {isPending && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="gold" className="flex-1" size="sm">
              接受
            </Button>
            <Button variant="ghost" className="flex-1" size="sm">
              婉拒
            </Button>
          </div>
        )}

        {!isPending && (
          <Link href={`/matches/${id}`}>
            <Button variant="outline" className="w-full" size="sm">
              查看详情
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

/* ============================================
 * MatchCardSkeleton - 加载骨架
 * ============================================ */
export function MatchCardSkeleton() {
  return (
    <Card variant="elevated" className="border-l-4 border-l-[var(--gold)]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-24 bg-[var(--ink-muted)]/20 rounded" />
        </div>
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-[var(--ink-muted)]/20 rounded-full" />
            <div className="h-4 w-16 bg-[var(--ink-muted)]/20 rounded" />
          </div>
          <div className="w-12 h-px bg-[var(--border)]" />
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-[var(--ink-muted)]/20 rounded-full" />
            <div className="h-4 w-16 bg-[var(--ink-muted)]/20 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-[var(--ink-muted)]/20 rounded" />
            <div className="h-6 w-12 bg-[var(--ink-muted)]/20 rounded" />
          </div>
          <div className="h-2 w-full bg-[var(--ink-muted)]/20 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
