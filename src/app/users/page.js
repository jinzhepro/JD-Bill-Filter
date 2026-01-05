"use client";

import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { UserManager } from "@/components/UserManager";
import { RouteGuard } from "@/components/RouteGuard";

function UserContent() {
  return (
    <div className="space-y-8">
      {/* 功能介绍 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">用户管理</h2>
          <p className="text-gray-600 mb-6">
            管理系统用户，包括添加、编辑、删除用户和重置密码等操作
          </p>
        </div>
      </section>

      {/* 用户管理组件 */}
      <UserManager />
    </div>
  );
}

function UserWithGuard() {
  return (
    <RouteGuard>
      <MainLayout>
        <UserContent />
      </MainLayout>
    </RouteGuard>
  );
}

export default function UsersPage() {
  return <UserWithGuard />;
}
