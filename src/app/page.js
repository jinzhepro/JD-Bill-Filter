"use client";

import React from "react";
import { SimpleLayout } from "@/components/SimpleLayout";
import { SettlementContent } from "@/components/SettlementContent";
import { SettlementProvider } from "@/context/SettlementContext";

export default function SettlementPage() {
  return (
    <SimpleLayout>
      <SettlementProvider>
        <SettlementContent />
      </SettlementProvider>
    </SimpleLayout>
  );
}
