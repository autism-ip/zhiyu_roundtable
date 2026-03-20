/**
 * [INPUT]: 依赖 fetch, use State, useEffect, lucide-react
 * [OUTPUT]: 对外提供 ApiStatusBadge 组件
 * [POS]: components/bole/api-status-badge.tsx - API配置状态徽章
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface ApiStatusBadgeProps {
  /** 自定义类名 */
  className?: string
  /** 是否显示加载状态 */
  loading?: boolean
}

export function ApiStatusBadge({ className = "", loading: externalLoading }: ApiStatusBadgeProps) {
  const [status, setStatus] = useState<"loading" | "configured" | "unconfigured">("loading")
  const [tooltipContent, setTooltipContent] = useState("")

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/topics/zhihu-preview?topCnt=1")
        const data = await res.json()

        if (data.success && data.data?.configured === false) {
          setStatus("unconfigured")
          setTooltipContent(
            data.data.message || "知乎API未配置，请设置 ZHIHU_APP_KEY 和 ZHIHU_APP_SECRET"
          )
        } else if (data.success && data.data?.configured === true) {
          setStatus("configured")
          setTooltipContent("知乎API已配置")
        } else {
          setStatus("unconfigured")
          setTooltipContent("无法获取API配置状态")
        }
      } catch {
        setStatus("unconfigured")
        setTooltipContent("无法连接服务器检查API状态")
      }
    }

    if (externalLoading) {
      setStatus("loading")
      return
    }

    checkStatus()
  }, [externalLoading])

  if (status === "loading") {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        检测中
      </Badge>
    )
  }

  if (status === "configured") {
    return (
      <Badge
        variant="outline"
        title={tooltipContent}
        className={`gap-1 bg-green-500/10 border-green-500/30 text-green-400 ${className}`}
      >
        <CheckCircle className="w-3 h-3" />
        已配置
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      title={tooltipContent}
      className={`gap-1 bg-red-500/10 border-red-500/30 text-red-400 cursor-help ${className}`}
    >
      <XCircle className="w-3 h-3" />
      未配置
    </Badge>
  )
}
