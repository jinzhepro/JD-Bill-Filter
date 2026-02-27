import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SettlementProvider } from "@/context/SettlementContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LoadingProvider } from "@/context/LoadingContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata = {
  title: "京东单据处理系统",
  description: "智能单据处理系统",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground overflow-hidden">
        <ThemeProvider>
          <SettlementProvider>
            <LoadingProvider>
              <ErrorBoundary>
                {children}
                <LoadingOverlay />
                <Toaster />
              </ErrorBoundary>
            </LoadingProvider>
          </SettlementProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
