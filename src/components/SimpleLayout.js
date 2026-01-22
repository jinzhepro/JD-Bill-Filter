"use client";

import React from "react";
import { Sidebar } from "./Sidebar";

export function SimpleLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}
