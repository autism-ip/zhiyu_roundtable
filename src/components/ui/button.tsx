/**
 * Button 组件
 * [INPUT]: 依赖 Radix UI Slot、class-variance-authority、@/lib/utils
 * [OUTPUT]: 提供 gold | ink | ghost | outline 等多种变体的按钮组件
 * [POS]: components/ui/button.tsx - 按钮组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ============================================
 * Button Variants - 按钮变体
 * ============================================ */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* 金镶按钮 - 主要操作 */
        gold: [
          "bg-[var(--gold)] text-[var(--deep)]",
          "hover:brightness-110 hover:shadow-lg hover:shadow-[var(--gold-glow)]",
          "active:brightness-95",
        ].join(" "),
        /* 墨染按钮 - 次要操作 */
        ink: [
          "bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)]",
          "hover:bg-[var(--ink-muted)]/10 hover:border-[var(--ink-muted)]",
        ].join(" "),
        /* 幽灵按钮 - 透明背景 */
        ghost: [
          "hover:bg-[var(--ink-muted)]/10",
          "hover:text-[var(--ink)]",
        ].join(" "),
        /* 描金边框按钮 - 边框强调 */
        outline: [
          "border border-[var(--gold)] text-[var(--gold)] bg-transparent",
          "hover:bg-[var(--gold)]/10 hover:shadow-md hover:shadow-[var(--gold-glow)]",
        ].join(" "),
        /* 默认按钮 - 兼容旧代码 */
        default: [
          "bg-[var(--gold)] text-[var(--deep)]",
          "hover:brightness-110",
        ].join(" "),
        /* 破坏性操作 */
        destructive: [
          "bg-[var(--error)] text-[var(--ink)]",
          "hover:bg-[var(--error)]/90",
        ].join(" "),
        /* 次要操作 - 兼容旧代码 */
        secondary: [
          "bg-[var(--paper)] text-[var(--ink-light)] border border-[var(--border)]",
          "hover:bg-[var(--ink-muted)]/10",
        ].join(" "),
        /* 链接样式 */
        link: "text-[var(--gold)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
