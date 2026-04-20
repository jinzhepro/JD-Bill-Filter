"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { InvoiceForm } from "@/components/InvoiceForm";

export default function InvoicePage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">发票开具申请</h1>
        <p className="text-muted-foreground">填写发票信息后导出 Excel 文件</p>
        <InvoiceForm />
      </div>
    </SimpleLayout>
  );
}