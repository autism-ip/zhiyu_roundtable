/**
 * NextAuth 配置
 * [INPUT]: 依赖 NextAuth、Prisma Adapter、SecondMe OAuth
 * [OUTPUT]: 提供认证配置和 SecondMe OAuth Provider
 * [POS]: lib/auth.ts - 认证配置中心
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import NextAuth from "next-auth";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

// 扩展 Session 类型
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// SecondMe OAuth Provider
const SecondMeProvider = {
  id: "secondme",
  name: "SecondMe",
  type: "oauth" as const,
  version: "2.0",
  authorization: {
    url: `${process.env.SECONDME_API_URL}/oauth/authorize`,
    params: {
      scope: "user.info user.info.shades chat note.add",
      response_type: "code",
    },
  },
  token: `${process.env.SECONDME_API_URL}/oauth/token`,
  userinfo: `${process.env.SECONDME_API_URL}/api/user`,
  profile(profile: any) {
    return {
      id: profile.id,
      name: profile.name || profile.nickname,
      email: profile.email,
      image: profile.avatar,
      secondmeId: profile.id,
    };
  },
  clientId: process.env.SECONDME_CLIENT_ID,
  clientSecret: process.env.SECONDME_CLIENT_SECRET,
};

// NextAuth 配置
export const authOptions: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    SecondMeProvider,
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    signIn: async () => {
      return true;
    },
  },
  events: {
    signIn: async ({ user, isNewUser }) => {
      console.log(`User ${user.email} signed in`);
      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
        try {
          await prisma.agent.create({
            data: {
              userId: user.id,
              name: user.name ? `${user.name}的Agent` : '我的Agent',
              personality: '友善、好奇、善于倾听',
              expertise: [],
              tone: 'friendly',
              isActive: true,
            },
          });
        } catch (error) {
          console.error('Failed to create default agent:', error);
        }
      }
    },
  },
};

// 导出 NextAuth handler
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// 辅助函数：获取当前用户
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

// 辅助函数：检查用户是否已认证
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
