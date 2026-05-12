"use client";

import React from "react";
import { MainLayout } from "./MainLayout";
import { Sidebar } from "./Sidebar";

/**
 * 京东万商业务布局组件
 */
export function SimpleLayout({ children }) {
  return (
    <MainLayout sidebar={<Sidebar />}>
      {children}
    </MainLayout>
  );
}
