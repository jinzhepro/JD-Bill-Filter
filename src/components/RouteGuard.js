"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useApp();

  useEffect(() => {
    // 如果在登录页面且已经登录，跳转到主页
    if (pathname === "/login" && isAuthenticated) {
      router.push("/");
      return;
    }

    // 如果不在登录页面且未登录，跳转到登录页
    if (pathname !== "/login" && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, pathname, router]);

  // 如果在登录页面，直接渲染子组件
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // 如果未登录且不在登录页面，显示加载状态
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
