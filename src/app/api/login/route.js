import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'auth_token';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'qingyun2026';

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (password === AUTH_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      response.cookies.set(AUTH_COOKIE, AUTH_PASSWORD, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30天
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: '请求错误' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}