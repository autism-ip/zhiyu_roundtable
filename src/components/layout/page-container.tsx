/**
 * PageContainer 组件
 * [INPUT]: 依赖 @/lib/utils 的 cn 函数
 * [OUTPUT]: 提供页面容器组件，响应式 spacing
 * [POS]: components/layout/page-container.tsx - 页面容器组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ============================================
 * Spacing Variants
 * ============================================ */
const spacingVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      default: "max-w-7xl px-4 sm:px-6 lg:px-8",
      sm: "max-w-3xl px-4 sm:px-6",
      lg: "max-w-5xl px-4 sm:px-6 lg:px-8",
      full: "max-w-full px-4 sm:px-6 lg:px-12",
      narrow: "max-w-2xl px-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spacingVariants> {
  /** 顶部间距 */
  padTop?: boolean
  /** 底部间距 */
  padBottom?: boolean
  /** 禁用安全区适配 */
  disableSafeArea?: boolean
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size, padTop = true, padBottom = true, disableSafeArea = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          spacingVariants({ size }),
          padTop && "pt-6 sm:pt-8 lg:pt-10",
          padBottom && "pb-6 sm:pb-8 lg:pb-10",
          !disableSafeArea && "safe-area-inset",
          className
        )}
        {...props}
      />
    )
  }
)
PageContainer.displayName = "PageContainer"

/* ============================================
 * Section - 内容区块
 * ============================================ */
interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 区块标题 */
  title?: string
  /** 区块描述 */
  description?: string
  /** 隐藏顶部边框 */
  noBorder?: boolean
}

function Section({
  className,
  title,
  description,
  noBorder,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-6",
        !noBorder && "border-t border-[var(--border)]",
        className
      )}
      {...props}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-serif font-semibold text-[var(--ink)]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

/* ============================================
 * Grid - 响应式网格
 * ============================================ */
const gridVariants = cva("grid gap-4 sm:gap-6", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    },
  },
})

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  /** 固定列宽 */
  fixedCols?: number
}

function Grid({
  className,
  cols,
  fixedCols,
  children,
  ...props
}: GridProps) {
  // 如果指定了固定列数
  if (fixedCols) {
    return (
      <div
        className={cn(
          "grid gap-4 sm:gap-6",
          `grid-cols-1 ${fixedCols >= 2 ? "sm:grid-cols-2" : ""} ${fixedCols >= 3 ? "lg:grid-cols-3" : ""} ${fixedCols >= 4 ? "xl:grid-cols-4" : ""}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={cn(gridVariants({ cols }), className)} {...props}>
      {children}
    </div>
  )
}

/* ============================================
 * Stack - 垂直堆叠
 * ============================================ */
const stackVariants = cva("flex flex-col", {
  variants: {
    gap: {
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
  },
  defaultVariants: {
    gap: "md",
    align: "stretch",
    justify: "start",
  },
})

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

function Stack({
  className,
  gap,
  align,
  justify,
  children,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(stackVariants({ gap, align, justify }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { PageContainer, Section, Grid, Stack, spacingVariants }
