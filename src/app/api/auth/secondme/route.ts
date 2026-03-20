/**
 * SecondMe OAuth 回调处理
 * [INPUT]: 依赖 user-service 的 getUserService, UserService
 * [OUTPUT]: 设置 session cookie 并创建数据库用户记录
 * [POS]: app/api/auth/secondme/route.ts - SecondMe OAuth 回调
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserService } from "@/lib/user/user-service";

const API_BASE_URL = process.env.SECONDME_API_URL || "https://api.mindverse.com/gate/lab";
const TOKEN_ENDPOINT = `${API_BASE_URL}/api/oauth/token/code`;
const USERINFO_ENDPOINT = `${API_BASE_URL}/api/secondme/user/info`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // 如果有错误，返回错误信息
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=no_code", request.url)
    );
  }

  // 获取存储的 code_verifier
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("secondme_code_verifier")?.value;
  const storedState = cookieStore.get("secondme_oauth_state")?.value;

  // 清理 cookie
  const response = NextResponse.redirect(new URL("/", request.url));

  // 如果没有 code_verifier，说明 OAuth 流程未正确启动
  if (!codeVerifier) {
    console.error("[SecondMe OAuth] No code_verifier found in cookies");
    return NextResponse.redirect(
      new URL("/login?error=oauth_flow_error", request.url)
    );
  }

  try {
    // 交换 token
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/api/auth/secondme",
        client_id: process.env.SECONDME_CLIENT_ID!,
        client_secret: process.env.SECONDME_CLIENT_SECRET!,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("[SecondMe OAuth] Token response:", JSON.stringify(tokenData));

    if (tokenData.code !== 0 || !tokenData.data) {
      console.error("[SecondMe OAuth] Token exchange failed:", tokenData.message);
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed`, request.url)
      );
    }

    const { accessToken, refreshToken } = tokenData.data;

    // 获取用户信息
    const userResponse = await fetch(USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();
    console.log("[SecondMe OAuth] User info response:", JSON.stringify(userData));

    if (userData.code !== 0 || !userData.data) {
      console.error("[SecondMe OAuth] User info fetch failed:", userData.message);
      return NextResponse.redirect(
        new URL(`/login?error=user_info_failed`, request.url)
      );
    }

    const user = userData.data;
    console.log("[SecondMe OAuth] Logged in user:", user);

    // 获取用户兴趣标签（用于 agent expertise）
    let expertise: string[] = [];
    try {
      const shadesResponse = await fetch(`${API_BASE_URL}/api/secondme/user/shades`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const shadesData = await shadesResponse.json();
      console.log("[SecondMe OAuth] Shades response:", JSON.stringify(shadesData));

      if (shadesData.code === 0 && shadesData.data?.shades) {
        expertise = shadesData.data.shades.map((s: any) => s.name || s.tag || String(s));
        console.log("[SecondMe OAuth] Extracted expertise:", expertise);
      }
    } catch (shadesError) {
      // Shades 获取失败不影响登录流程
      console.warn("[SecondMe OAuth] Failed to fetch shades:", shadesError);
    }

    // 创建或获取数据库用户记录
    const userService = getUserService();
    let dbUser = await userService.getUserBySecondMeId(String(user.id));

    if (!dbUser) {
      // 首次登录，创建数据库用户记录
      console.log("[SecondMe OAuth] Creating new database user for SecondMe ID:", user.id);
      dbUser = await userService.createUser({
        email: user.email || `${user.id}@secondme.local`,
        name: user.name || user.username || "匿名用户",
        avatar: user.avatar_url || user.avatar,
        secondmeId: String(user.id),
        interests: expertise,  // 存储 SecondMe shades 作为用户兴趣标签
      });
      console.log("[SecondMe OAuth] Created database user:", dbUser.id);
    } else {
      console.log("[SecondMe OAuth] Found existing database user:", dbUser.id);
    }

    // 将数据库用户信息合并到 cookie
    const sessionUser = {
      ...user,
      dbId: dbUser.id,  // 数据库 UUID，供 API routes 使用
      expertise: expertise,  // SecondMe shades 作为 agent expertise
    };

    // 设置 session cookie（简化处理，实际应该用 JWT）
    response.cookies.set("secondme_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7200, // 2 hours
      path: "/",
    });

    response.cookies.set("secondme_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    response.cookies.set("secondme_user", JSON.stringify(sessionUser), {
      httpOnly: false, // 可被前端读取
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // 清理 OAuth 流程 cookie
    response.cookies.delete("secondme_code_verifier");
    response.cookies.delete("secondme_oauth_state");

    return response;
  } catch (error) {
    console.error("[SecondMe OAuth] Error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=oauth_error`, request.url)
    );
  }
}
