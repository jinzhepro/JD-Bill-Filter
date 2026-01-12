"use client";

import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { SettlementContent } from "@/components/SettlementContent";

export default function SettlementPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* 功能介绍 */}
        <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              结算单处理
            </h2>
            <p className="text-gray-600 mb-6">
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
