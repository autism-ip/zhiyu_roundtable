/**
 * Navbar 组件 - 四层架构导航
 * [INPUT]: 依赖 useSecondMeSession hook、Lucide icons
 * [OUTPUT]: 提供顶部导航栏组件
 * [POS]: components/navbar.tsx - 顶部导航，四层架构入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, Square, Bot, Users, MessageSquare, User, LogOut, Tag } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  activeDebateId?: string;
  activeCotrialId?: string;
}

export function Navbar({ activeDebateId, activeCotrialId }: NavbarProps) {
  const { user, isLoading } = useSecondMeSession();
  const router = useRouter();

  // ===========================================
  // 模式状态管理
  // ===========================================
  const [isAgentMode, setIsAgentMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("agent_mode") === "true";
    }
    return false;
  });

  const toggleMode = () => {
    const newMode = !isAgentMode;
    setIsAgentMode(newMode);
    localStorage.setItem("agent_mode", String(newMode));
  };

  // 登出处理：清除所有 SecondMe cookie 和 localStorage 并刷新页面
  const handleLogout = () => {
    document.cookie = "secondme_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "secondme_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "secondme_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    // 清除 localStorage 中的 Agent 模式状态
    localStorage.removeItem("agent_mode");
    localStorage.removeItem("agent_mode_config");
    localStorage.removeItem("agent_selected_id");
    window.location.reload();
  };

  return (
    <>
      {/* =============================================
          模式状态栏 - Agent/人类模式切换
          始终显示，不依赖登录状态
          ============================================= */}
      <div className="bg-[var(--ink-950)] text-[var(--gold)] px-4 py-1.5 text-xs flex items-center justify-between border-b border-[var(--ink-800)]">
        <div className="flex items-center gap-2">
          {isAgentMode ? (
            <Bot className="w-3 h-3 text-[var(--gold)]" />
          ) : (
            <User className="w-3 h-3 text-[var(--gold)]" />
          )}
          <span>
            当前模式：
            {isAgentMode ? (
              <span className="text-[var(--gold)] font-medium">Agent 模式</span>
            ) : (
              <span className="text-[var(--gold)] font-medium opacity-80">人类模式</span>
            )}
          </span>
        </div>
        <button
          onClick={toggleMode}
          className="hover:text-[var(--gold)] transition-colors text-[var(--gold)] opacity-80"
        >
          切换为 {isAgentMode ? "人类模式" : "Agent 模式"}
        </button>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-[var(--ink-900)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--ink-900)]/60">
        <div className="container flex h-14 items-center">
          {/* Logo */}
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-xl font-bold text-[var(--gold)] hover:text-[var(--gold-muted)] transition-colors">
              知遇圆桌
            </span>
          </Link>

          {/* 伯乐层 - 发现 */}
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/rounds"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <MessageSquare className="h-4 w-4" />
              圆桌
            </Link>
            <Link
              href="/matches"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <Users className="h-4 w-4" />
              知遇卡
            </Link>
            <Link
              href="/topics"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <Tag className="h-4 w-4" />
              话题
            </Link>

            {/* 争鸣层 - 验证 (条件显示) */}
            {activeDebateId && (
              <Link
                href={`/debates/${activeDebateId}`}
                className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                争鸣层
              </Link>
            )}

            {/* 共试层 - 落地 (条件显示) */}
            {activeCotrialId && (
              <Link
                href={`/cotrials/${activeCotrialId}`}
                className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                共试层
              </Link>
            )}
          </nav>

          {/* 辅助功能 - 从右往左 */}
          <nav className="ml-auto flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/timeline"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <Clock className="h-4 w-4" />
              时间线
            </Link>
            <Link
              href="/square"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <Square className="h-4 w-4" />
              广场
            </Link>
            <Link
              href="/agent-mode"
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--gold-500)] text-[var(--gold-200)]"
            >
              <Bot className="h-4 w-4" />
              Agent
            </Link>
          </nav>

          {/* 用户菜单 */}
          <div className="ml-4 flex items-center">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--gold-900)]" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || undefined} alt={user.name || ""} />
                      <AvatarFallback className="bg-[var(--gold-900)] text-[var(--gold-200)]">
                        {user.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[var(--ink-800)] border-[var(--ink-700)]" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.name && (
                        <p className="font-medium text-[var(--gold-100)]">{user.name}</p>
                      )}
                      {user.email && (
                        <p className="w-[200px] truncate text-sm text-[var(--gold-500)]">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-[var(--ink-700)]" />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="text-[var(--gold-200)] hover:text-[var(--gold-500)]">
                      <User className="mr-2 h-4 w-4" />
                      个人资料
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rounds" className="text-[var(--gold-200)] hover:text-[var(--gold-500)]">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      我的圆桌
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/matches" className="text-[var(--gold-200)] hover:text-[var(--gold-500)]">
                      <Users className="mr-2 h-4 w-4" />
                      我的知遇卡
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--ink-700)]" />
                  <DropdownMenuItem
                    className="cursor-pointer text-[var(--gold-200)] hover:text-[var(--gold-500)]"
                    onSelect={(event) => {
                      event.preventDefault();
                      handleLogout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default" size="sm" className="bg-[var(--gold-600)] hover:bg-[var(--gold-500)]">
                <Link href="/login">登录</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
