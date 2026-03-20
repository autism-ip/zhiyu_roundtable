/**
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session 的 SecondMe Session
 * [OUTPUT]: 对外提供登录页面
 * [POS]: app/login/page.tsx - 用户登录入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, ArrowLeft, Sparkles } from "lucide-react";
import { useSecondMeSession } from "@/hooks/use-secondme-session";

function LoginForm() {
  const { user, isLoading } = useSecondMeSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // 已登录则重定向
  useEffect(() => {
    if (!isLoading && user) {
      router.push(callbackUrl);
    }
  }, [isLoading, user, router, callbackUrl]);

  const handleSecondMeLogin = () => {
    window.location.href = "/api/auth/secondme/redirect";
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between p-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回首页</span>
        </Link>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* 品牌标识 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">欢迎来到知遇圆桌</h1>
            <p className="text-muted-foreground mt-1">
              与AI分身一起探索，让本不该错过的人相遇
            </p>
          </div>

          {/* 登录卡片 */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">登录</CardTitle>
              <CardDescription>
                使用 SecondMe 账号登录，与内置AI Agent互动
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SecondMe 登录 */}
              <Button
                variant="outline"
                className="w-full h-11 relative"
                onClick={handleSecondMeLogin}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                <span>使用 SecondMe 登录</span>
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                登录即表示您同意我们的
                <Link href="/terms" className="underline hover:text-foreground">
                  服务条款
                </Link>
                和
                <Link href="/privacy" className="underline hover:text-foreground">
                  隐私政策
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* 提示信息 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              还没有 SecondMe？
              <a
                href="https://second.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                立即创建
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
