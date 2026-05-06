"use client";

import { useState } from "react";
import { SimpleLayout } from "@/components/SimpleLayout";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoiceHistoryManager } from "@/components/InvoiceHistoryManager";
import { CustomerImportModal } from "@/components/CustomerImportModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, FileText } from "lucide-react";
import { useInvoice } from "@/context/InvoiceContext";

export default function InvoicePage() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { setCustomerInfo } = useInvoice();

  const handleImportCustomer = (data) => {
    setCustomerInfo(data);
  };

  return (
    <SimpleLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">发票开具申请</h1>
            <p className="text-muted-foreground">填写发票信息后导出 Excel 文件</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              导入开票信息
            </Button>
            <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
              <History className="w-4 h-4 mr-2" />
              查看历史
            </Button>
          </div>
        </div>
        <InvoiceForm />

        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>发票导出历史</DialogTitle>
            </DialogHeader>
            <InvoiceHistoryManager />
          </DialogContent>
        </Dialog>

        <CustomerImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onImport={handleImportCustomer}
        />
      </div>
    </SimpleLayout>
  );
}