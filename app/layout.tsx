import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "知遇圆桌 - 发现本不该错过的人",
  description: "AI驱动的智能关系发现平台，通过三层架构（伯乐层-争鸣层-共试层）帮助用户找到真正有价值的连接。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} font-serif antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
