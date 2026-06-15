import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { validateSession } from "@/lib/auth";

export const runtime = "edge";

const AUTH_COOKIE = "auth_token";

export async function GET(request) {
  try {
    const authCookie = request.cookies.get(AUTH_COOKIE);

    if (!authCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const isValid = await validateSession(db, authCookie.value);

    return NextResponse.json({ authenticated: isValid });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
