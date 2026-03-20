/**
 * ChatBubble 组件
 * [INPUT]: 依赖 @/lib/utils 的 cn 函数
 * [OUTPUT]: 提供 user | agent | system 三种类型的对话气泡
 * [POS]: components/ui/chat-bubble.tsx - 对话气泡组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

/* ============================================
 * 类型定义
 * ============================================ */
type BubbleRole = "user" | "agent" | "system"

/* ============================================
 * ChatBubble Variants
 * ============================================ */
const bubbleVariants = cva(
  "flex gap-3 max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300",
  {
    variants: {
      bubbleRole: {
        user: "ml-auto flex-row-reverse",
        agent: "mr-auto",
        system: "mx-auto flex-col items-center text-center",
      },
    },
  }
)

const bubbleStyles = cva(
  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
  {
    variants: {
      bubbleRole: {
        user: [
          "bg-[var(--gold)] text-[var(--deep)] rounded-br-md",
          "hover:brightness-105",
        ].join(" "),
        agent: [
          "bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] rounded-bl-md",
          "hover:border-[var(--ink-muted)]",
        ].join(" "),
        system: [
          "bg-transparent text-[var(--ink-muted)] text-xs italic",
        ].join(" "),
      },
    },
  }
)

/* ============================================
 * 类型定义 - 避免 role 属性冲突
 * ============================================ */
export interface ChatBubbleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  role: BubbleRole
  avatar?: string
  name?: string
  timestamp?: Date | string
}

export interface ChatBubbleContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  role: BubbleRole
}

/* ============================================
 * ChatBubbleContent
 * ============================================ */
const ChatBubbleContent = React.forwardRef<
  HTMLDivElement,
  ChatBubbleContentProps
>(({ className, role, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(bubbleStyles({ bubbleRole: role }), className)}
    {...props}
  />
))
ChatBubbleContent.displayName = "ChatBubbleContent"

/* ============================================
 * ChatBubble
 * ============================================ */
const ChatBubble = React.forwardRef<
  HTMLDivElement,
  ChatBubbleProps
>(({ className, role = "agent", avatar, name, timestamp, children, ...props }, ref) => {
  const isUser = role === "user"
  const isSystem = role === "system"

  if (isSystem) {
    return (
      <div
        ref={ref}
        className={cn(bubbleVariants({ bubbleRole: role }), className)}
        {...props}
      >
        {children}
        {timestamp && (
          <span className="text-xs text-[var(--ink-muted)] mt-1">
            {new Date(timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(bubbleVariants({ bubbleRole: role }), className)}
      {...props}
    >
      {/* 头像 */}
      {!isUser && (
        <Avatar className="w-8 h-8 border border-[var(--border)]">
          {avatar && <AvatarImage src={avatar} alt={name || "Agent"} />}
          <AvatarFallback className="bg-[var(--paper)] text-[var(--ink-muted)] text-xs">
            {name?.[0] || "A"}
          </AvatarFallback>
        </Avatar>
      )}

      {/* 气泡内容 */}
      <div className="flex flex-col gap-1">
        {!isUser && name && (
          <span className="text-xs text-[var(--ink-muted)] px-1">
            {name}
          </span>
        )}
        <ChatBubbleContent role={role}>
          {children}
        </ChatBubbleContent>
        {timestamp && (
          <span className={cn(
            "text-xs text-[var(--ink-muted)] px-1",
            isUser && "text-right"
          )}>
            {new Date(timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <Avatar className="w-8 h-8 border border-[var(--gold)]">
          {avatar && <AvatarImage src={avatar} alt="You" />}
          <AvatarFallback className="bg-[var(--gold)] text-[var(--deep)] text-xs">
            U
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})
ChatBubble.displayName = "ChatBubble"

/* ============================================
 * ChatBubbleGroup - 消息组
 * ============================================ */
interface ChatBubbleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: Array<{
    id: string
    role: BubbleRole
    content: string
    avatar?: string
    name?: string
    timestamp?: Date | string
  }>
}

function ChatBubbleGroup({
  messages,
  className,
  ...props
}: ChatBubbleGroupProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          role={message.role}
          avatar={message.avatar}
          name={message.name}
          timestamp={message.timestamp}
        >
          {message.content}
        </ChatBubble>
      ))}
    </div>
  )
}

export { ChatBubble, ChatBubbleContent, ChatBubbleGroup, bubbleVariants }
