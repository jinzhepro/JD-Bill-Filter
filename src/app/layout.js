import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata = {
  title: "京东单据处理系统",
  description: "智能单据处理系统",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>
          <AppProvider>
            <ErrorBoundary>
              {children}
              <Toaster />
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
