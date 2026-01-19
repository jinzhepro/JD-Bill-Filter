"use client";

import React from "react";
import { AppContent } from "@/components/AppContent";
import { MainLayout } from "@/components/MainLayout";
import { OrderProvider } from "@/context/OrderContext";

export default function Home() {
  return (
    <MainLayout>
      <OrderProvider>
        <AppContent />
      </OrderProvider>
    </MainLayout>
  );
}
