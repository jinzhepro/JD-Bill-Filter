import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "京东万商库存管理系统",
  description: "智能库存管理和对帐单处理系统",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
