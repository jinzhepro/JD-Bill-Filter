"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, ArrowLeftRight } from "lucide-react";

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
    <aside className="bg-card border-r border-border w-64 min-h-screen flex flex-col">
      {/* Logo 区域 */}
      <div className="h-14 border-b border-border flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              京东单据处理
            </h2>
            <p className="text-xs text-muted-foreground">JD Bill Filter</p>
          </div>
        </div>
      </div>

      {/* 菜单项 */}
      <nav className="p-4 flex-1">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2.5 rounded-md
                    transition-all duration-200 ease-in-out
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
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
    </aside>
  );
}
