"use client";

import React from "react";
import { AppProvider } from "@/context/AppContext";
import { AppContent } from "@/components/AppContent";

export default function Home() {
  return (
    <AppProvider>
      <div className="container">
        <header className="header text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            京东万商对帐单处理系统
          </h1>
          <p className="subtitle text-xl text-white opacity-90">
            自动过滤和处理对帐单数据
          </p>
        </header>

        <main className="main-content flex-1">
          <AppContent />
        </main>

        <footer className="footer text-center mt-10 text-white opacity-80">
          <p>京东万商对帐单处理系统 v2.0</p>
        </footer>
      </div>
    </AppProvider>
  );
}
