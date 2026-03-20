/**
 * SecondMe Token API
 * [INPUT]: 依赖 secondme_access_token httpOnly cookie
 * [OUTPUT]: 返回 access_token 给客户端
 * [POS]: app/api/auth/secondme/token - Token 中转 API
 * [PROTOCOL]: 变更时更新此头部
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("secondme_access_token");

    if (!tokenCookie) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: tokenCookie.value,
    });
  } catch (error) {
    console.error("Error reading token cookie:", error);
    return NextResponse.json(
      { error: "Failed to read token" },
      { status: 500 }
    );
  }
}
