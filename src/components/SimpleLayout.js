"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * 简单的布局组件
 * 包含侧边栏、头部导航和主要内容区域
 * @param {React.ReactNode} children - 子组件
 */
export function SimpleLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-end px-6 gap-4 flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            版本 0.1.0
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 bg-gradient-to-br from-background to-muted/20 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
