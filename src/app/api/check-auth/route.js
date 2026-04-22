import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'auth_token';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'qingyun2026';

export async function GET(request) {
  const authCookie = request.cookies.get(AUTH_COOKIE);
  const authenticated = authCookie && authCookie.value === AUTH_PASSWORD;
  
  return NextResponse.json({ authenticated });
}