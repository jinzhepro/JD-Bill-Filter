"use client";

import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { SettlementContent } from "@/components/SettlementContent";

export default function SettlementPage() {
  return (
    <MainLayout>
      <div className="space-y-4">
        {/* 功能介绍 */}
        <section className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              结算单处理
            </h2>
            <p className="text-sm text-muted-foreground">
              智能处理Excel/CSV结算单，自动合并相同商品编码和单价的记录
            </p>
          </div>
        </section>

        {/* 主要功能内容 */}
        <SettlementContent />
      </div>
    </MainLayout>
  );
}
