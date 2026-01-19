"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

export function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* 页面内容 */}
          <main className="flex-1 overflow-auto p-6">{children}</main>

          {/* 脚部 */}
          <footer className="bg-card border-t border-border px-6 py-3 shrink-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>© 2026 京东单据处理系统. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <a
                  href="https://github.com/jinzhepro/JD-Bill-Filter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
