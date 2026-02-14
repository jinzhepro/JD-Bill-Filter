"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SimpleLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center justify-end px-6 gap-4 flex-shrink-0">
          <div className="text-xs text-muted-foreground">版本 0.1.0</div>
          <ThemeToggle />
        </header>
        <main className="flex-1 bg-background p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
