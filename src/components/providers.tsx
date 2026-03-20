/**
 * 全局 Providers 组件
 * [INPUT]: 依赖 React Query、主题配置
 * [OUTPUT]: 组合所有全局上下文 Provider
 * [POS]: components/providers.tsx - 全局 Provider 组合器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

// 主题 Provider 包装器
function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// 查询客户端配置
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1分钟
        gcTime: 5 * 60 * 1000, // 5分钟
        retry: 3,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

// 主 Providers 组件
// Note: SecondMe 使用 cookie-based session，不需要 SessionProvider
export function Providers({ children }: { children: React.ReactNode }) {
  // 使用 useState 确保 QueryClient 在服务端和客户端保持一致
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'inherit',
            },
          }}
        />
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
