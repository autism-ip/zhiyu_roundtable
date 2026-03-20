/**
 * SecondMe OAuth 重定向
 * 直接构造 OAuth URL 并重定向，绕过 NextAuth
 */

import { NextResponse } from "next/server";

const OAUTH_URL = "https://go.second.me/oauth/";
const CLIENT_ID = process.env.SECONDME_CLIENT_ID!;
const REDIRECT_URI = "http://localhost:3000/api/auth/secondme";
const SCOPES = ["user.info", "user.info.shades", "chat", "note.add"].join(" ");

// 生成 PKCE
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // 生成 state 并存储到 cookie
  const state = crypto.randomUUID();

  const authUrl = new URL(OAUTH_URL);
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  // 创建响应并设置 cookie
  const response = NextResponse.redirect(authUrl.toString(), {
    status: 302,
  });

  // 设置 httpOnly cookie 存储 code_verifier 和 state
  response.cookies.set("secondme_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  response.cookies.set("secondme_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
