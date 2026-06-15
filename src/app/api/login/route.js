import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import logger from "@/lib/logger";
import {
  verifyPassword,
  getPasswordHash,
  createSession,
  clearSession,
} from "@/lib/auth";

export const runtime = "edge";

const AUTH_COOKIE = "auth_token";

export async function POST(request) {
  try {
    const { password } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;

    const passwordHash = await getPasswordHash(db);

    // 如果数据库中没有密码，返回错误
    if (!passwordHash) {
      return NextResponse.json(
        { success: false, error: "系统未初始化，请先设置密码" },
        { status: 500 },
      );
    }

    const isValid = await verifyPassword(password, passwordHash);

    if (isValid) {
      const token = await createSession(db);
      const response = NextResponse.json({ success: true });

      response.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30, // 30天
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "密码错误" },
      { status: 401 },
    );
  } catch (error) {
    logger.error("登录请求处理失败:", error);
    return NextResponse.json(
      { success: false, error: "请求处理失败" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    await clearSession(db);
  } catch (error) {
    logger.error("清除session失败:", error);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
