"use client";

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  // 登录页面不需要保护
  if (pathname === '/login') {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}