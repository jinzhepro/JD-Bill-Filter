"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { InvoiceHistoryManager } from "@/components/InvoiceHistoryManager";

export default function InvoiceHistoryPage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">发票导出历史</h1>
        <p className="text-muted-foreground">查看发票导出历史记录</p>
        <InvoiceHistoryManager />
      </div>
    </SimpleLayout>
  );
}