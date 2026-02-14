"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, ArrowLeftRight } from "lucide-react";

/**
 * 侧边栏导航组件
 * 提供主要功能页面的导航链接
 */
export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      name: "结算单处理",
      href: "/",
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      name: "供应商转换",
      href: "/suppliers",
      icon: <ArrowLeftRight className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="bg-card border-r border-border w-64 min-h-screen flex flex-col shadow-sm">
      {/* Logo 区域 */}
      <div className="h-16 border-b border-border flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              京东单据处理
            </h2>
            <p className="text-xs text-muted-foreground">JD Bill Filter</p>
          </div>
        </div>
      </div>

      {/* 菜单项 */}
      <nav className="p-4 flex-1">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-xl
                    transition-all duration-200 ease-out cursor-pointer
                    ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }
                  `}
                >
                  <span
                    className={`flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部版权信息 */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2024 JD Bill Filter
        </p>
      </div>
    </aside>
  );
}
