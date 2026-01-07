"use client";

import React from "react";
import { DeductionRecords } from "@/components/DeductionRecords";
import { MainLayout } from "@/components/MainLayout";
import { RouteGuard } from "@/components/RouteGuard";

function OutboundRecordsContent() {
  return (
    <div className="space-y-6">
      <DeductionRecords />
    </div>
  );
}

function OutboundRecordsWithGuard() {
  return (
    <RouteGuard>
      <MainLayout>
        <OutboundRecordsContent />
      </MainLayout>
    </RouteGuard>
  );
}

export default function OutboundRecordsPage() {
  return <OutboundRecordsWithGuard />;
}
