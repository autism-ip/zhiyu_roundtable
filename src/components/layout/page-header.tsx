/**
 * PageHeader 组件
 * [INPUT]: 依赖 @/components/ui/button、@/lib/utils
 * [OUTPUT]: 提供页面头部组件，带标题、副标题、操作按钮
 * [POS]: components/layout/page-header.tsx - 页面头部组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, LucideIcon } from "lucide-react"

/* ============================================
 * 类型定义
 * ============================================ */
export interface PageHeaderProps {
  /** 标题 */
  title: string
  /** 副标题 */
  description?: string
  /** 返回链接 */
  backHref?: string
  /** 返回按钮文字 */
  backLabel?: string
  /** 自定义返回图标 */
  backIcon?: LucideIcon
  /** 操作按钮配置 */
  actions?: Array<{
    label: string
    href?: string
    onClick?: () => void
    variant?: "gold" | "ink" | "ghost" | "outline"
    icon?: LucideIcon
    disabled?: boolean
  }>
  /** 标题对齐方式 */
  align?: "left" | "center"
  /** 层级颜色 */
  layer?: "daiqing" | "zhuhong" | "jiangzi"
  /** 隐藏底部边框 */
  noBorder?: boolean
  className?: string
}

/* ============================================
 * PageHeader 组件
 * ============================================ */
function PageHeader({
  title,
  description,
  backHref,
  backLabel = "返回",
  backIcon: BackIcon = ArrowLeft,
  actions = [],
  align = "left",
  layer,
  noBorder,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "pb-6 mb-6",
        !noBorder && "border-b border-[var(--border)]",
        layer && `accent-bar-${layer}`,
        className
      )}
    >
      {/* 顶部光条 */}
      {layer && (
        <div
          className={cn(
            "h-0.5 w-full mb-6 rounded-full",
            layer === "daiqing" && "bg-gradient-to-r from-transparent via-[var(--daiqing)] to-transparent",
            layer === "zhuhong" && "bg-gradient-to-r from-transparent via-[var(--zhuhong)] to-transparent",
            layer === "jiangzi" && "bg-gradient-to-r from-transparent via-[var(--jiangzi)] to-transparent"
          )}
        />
      )}

      <div
        className={cn(
          "flex items-start justify-between gap-4",
          align === "center" && "flex-col items-center text-center"
        )}
      >
        {/* 左侧：返回 + 标题 */}
        <div className="flex items-center gap-3">
          {backHref && (
            <>
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link href={backHref}>
                  <BackIcon className="w-4 h-4 mr-1" />
                  {backLabel}
                </Link>
              </Button>
              <div className="w-px h-6 bg-[var(--border)]" />
            </>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink)] tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-[var(--ink-muted)] max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions.map((action, index) => {
              const Icon = action.icon
              const buttonContent = (
                <Button
                  variant={action.variant || "ink"}
                  size="sm"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={cn(
                    Icon && "gap-1.5"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {action.label}
                </Button>
              )

              if (action.href) {
                return (
                  <Link key={index} href={action.href}>
                    {buttonContent}
                  </Link>
                )
              }

              return (
                <div key={index}>
                  {buttonContent}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}

/* ============================================
 * PageTitle - 简化版标题
 * ============================================ */
export interface PageTitleProps {
  title: string
  layer?: "daiqing" | "zhuhong" | "jiangzi"
  className?: string
}

function PageTitle({ title, layer, className }: PageTitleProps) {
  return (
    <div className={cn("relative", className)}>
      {layer && (
        <div
          className={cn(
            "absolute -left-4 top-0 bottom-0 w-1 rounded-full",
            layer === "daiqing" && "bg-[var(--daiqing)]",
            layer === "zhuhong" && "bg-[var(--zhuhong)]",
            layer === "jiangzi" && "bg-[var(--jiangzi)]"
          )}
        />
      )}
      <h2 className="text-xl font-serif font-semibold text-[var(--ink)]">
        {title}
      </h2>
    </div>
  )
}

export { PageHeader, PageTitle }
