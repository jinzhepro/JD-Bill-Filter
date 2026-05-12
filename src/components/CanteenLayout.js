"use client";

import React from "react";
import { MainLayout } from "./MainLayout";
import { CanteenSidebar } from "./CanteenSidebar";

/**
 * 食堂商城业务布局组件
 */
export function CanteenLayout({ children }) {
  return (
    <MainLayout sidebar={<CanteenSidebar />}>
      {children}
    </MainLayout>
  );
}