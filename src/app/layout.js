import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SettlementProvider } from "@/context/SettlementContext";
import { InvoiceProvider } from "@/context/InvoiceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata = {
  title: "京东单据处理系统",
  description: "智能单据处理系统",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-background text-foreground">
        <SettlementProvider>
          <InvoiceProvider>
            <ErrorBoundary>
              {children}
              <Toaster />
            </ErrorBoundary>
          </InvoiceProvider>
        </SettlementProvider>
      </body>
    </html>
  );
}
