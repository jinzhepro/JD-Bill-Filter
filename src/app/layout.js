import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "京东万商对帐单处理系统",
  description: "自动过滤和处理对帐单数据",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
