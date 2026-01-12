"use client";

import React from "react";
import { Sidebar } from "./Sidebar";

export function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-muted">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {/* 顶部标题栏 */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              京东万商库存管理系统
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">v0.0.7</span>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
