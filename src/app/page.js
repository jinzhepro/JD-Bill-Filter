"use client";

import React from "react";
import { AppContent } from "@/components/AppContent";
import { MainLayout } from "@/components/MainLayout";

export default function Home() {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* 功能介绍 */}
        <section className="bg-card rounded-lg shadow p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              对帐单处理
            </h2>
            <p className="text-muted-foreground mb-6">
              智能处理Excel/CSV对帐单，自动合并相同商品编码和单价的记录
            </p>
          </div>
        </section>

        {/* 主要功能内容 */}
        <AppContent />
      </div>
    </MainLayout>
  );
}
