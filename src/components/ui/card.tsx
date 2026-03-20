/**
 * Card 组件
 * [INPUT]: 依赖 @/lib/utils 的 cn 函数
 * [OUTPUT]: 提供 default | elevated | accent 三种变体的卡片组件，带顶部光条装饰
 * [POS]: components/ui/card.tsx - 卡片组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ============================================
 * Card Variants - 卡片变体
 * ============================================ */
const cardVariants = cva(
  "relative rounded-lg border overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        elevated: "bg-card text-card-foreground border-border shadow-lg hover:shadow-xl",
        accent: "bg-card text-card-foreground border-border accent-bar",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/* ============================================
 * 层级颜色变体 - 黛青/朱红/酱紫
 * ============================================ */
const layerVariants = cva(
  "relative rounded-lg border overflow-hidden transition-all duration-300",
  {
    variants: {
      layer: {
        daiqing: "border-daiqing/30 accent-bar-daiqing",
        zhuhong: "border-zhuhong/30 accent-bar-zhuhong",
        jiangzi: "border-jiangzi/30 accent-bar-jiangzi",
      },
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** 启用悬浮阴影效果 */
  hoverable?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant }),
        hoverable && "card-hover cursor-pointer",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

/* ============================================
 * 层级卡片 - 带意境的卡片
 * ============================================ */
export interface LayerCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof layerVariants> {
  hoverable?: boolean
}

const LayerCard = React.forwardRef<HTMLDivElement, LayerCardProps>(
  ({ className, layer, hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        layerVariants({ layer }),
        hoverable && "card-hover cursor-pointer",
        className
      )}
      {...props}
    />
  )
)
LayerCard.displayName = "LayerCard"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight font-serif",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--ink-muted)]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  LayerCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
  layerVariants,
}
