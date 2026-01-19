import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from "@/context/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata = {
  title: "京东单据处理系统",
  description: "智能单据处理系统",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AppProvider>
          <ErrorBoundary>
            {children}
            <Toaster />
          </ErrorBoundary>
        </AppProvider>
      </body>
    </html>
  );
}
