"use client";

import React from "react";
import { Sidebar } from "./Sidebar";

export function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-muted flex-col">
      {/* 侧边栏 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* 顶部标题栏 */}
          <header className="bg-card shadow-sm border-b border-border px-6 py-4 shrink-0">
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
          <main className="flex-1 overflow-auto p-6">{children}</main>

          {/* 脚部 */}
          <footer className="bg-card border-t border-border px-6 py-3 shrink-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>© 2026 京东万商库存管理系统. All rights reserved.</span>
              <a
                href="https://github.com/jinzhepro/JD-Bill-Filter"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
