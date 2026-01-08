"use client";

import React from "react";
import { SupplierProvider } from "@/context/SupplierContext";
import { MainLayout } from "@/components/MainLayout";
import { RouteGuard } from "@/components/RouteGuard";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { SettlementContent } from "@/components/SettlementContent";

// 内部组件，使用useApp hook
function SettlementPageContent() {
  const { currentUser, logout } = useApp();

  const handleLogout = () => {
    logout();
    // RouteGuard会自动处理重定向
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* 用户信息栏 */}
        <div className="bg-white rounded-xl shadow-lg p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              欢迎回来，{currentUser?.realName || currentUser?.username}
            </h2>
            <p className="text-gray-600">
              角色：{currentUser?.role === "admin" ? "管理员" : "普通用户"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            退出登录
          </Button>
        </div>

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

export default function SettlementPage() {
  return (
    <SupplierProvider>
      <RouteGuard>
        <SettlementPageContent />
      </RouteGuard>
    </SupplierProvider>
  );
}
