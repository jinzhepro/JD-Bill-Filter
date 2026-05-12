"use client";

import React from "react";
import { FileText } from "lucide-react";

/**
 * 通用主布局组件
 * 包含侧边栏、头部导航和主要内容区域
 * @param {React.ReactNode} children - 子组件
 * @param {React.ReactNode} sidebar - 侧边栏组件
 */
export function MainLayout({ children, sidebar }) {
  return (
    <div className="flex min-h-screen">
      <div className="fixed left-0 top-0 h-screen w-64 z-50">
        {sidebar}
      </div>
      <div className="flex-1 flex flex-col ml-64">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-end px-6 gap-4 flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <FileText className="w-3.5 h-3.5" />
            版本 0.1.0
          </div>
        </header>
        <main className="flex-1 bg-gradient-to-br from-background to-muted/20 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}