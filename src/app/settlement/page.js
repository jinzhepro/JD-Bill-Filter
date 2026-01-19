"use client";

import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { SettlementContent } from "@/components/SettlementContent";
import { SettlementProvider } from "@/context/SettlementContext";

export default function SettlementPage() {
  return (
    <MainLayout>
      <SettlementProvider>
        <SettlementContent />
      </SettlementProvider>
    </MainLayout>
  );
}
