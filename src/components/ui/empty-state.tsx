/**
 * 空状态组件
 * [INPUT]: 依赖 @/components/ui/button，lucide-react 图标
 * [OUTPUT]: 提供带图标和 CTA 的空状态展示组件
 * [POS]: components/ui/empty-state.tsx - 通用空状态组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-violet-500/10 mb-4 flex items-center justify-center">
        <Icon className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-medium text-violet-200 mb-2">{title}</h3>
      <p className="text-violet-400/60 max-w-sm mb-6">{description}</p>
      {actionLabel && (
        actionHref ? (
          <Button asChild variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-900/20">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        ) : actionOnClick ? (
          <Button variant="outline" onClick={actionOnClick} className="border-violet-500/30 text-violet-300 hover:bg-violet-900/20">
            {actionLabel}
          </Button>
        ) : null
      )}
    </div>
  );
}
