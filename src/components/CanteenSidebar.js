"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, LogOut, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * 食堂商城侧边栏导航组件
 */
export function CanteenSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const groups = [
    {
      title: "食堂业务",
      items: [
        {
          name: "食堂采购单",
          href: "/canteen-purchase",
          icon: <UtensilsCrossed className="w-5 h-5" />,
        },
        {
          name: "开票管理",
          href: "/canteen-invoice",
          icon: <FileSpreadsheet className="w-5 h-5" />,
        },

      ],
    },
  ];

  return (
    <aside className="bg-card border-r border-border w-64 h-screen flex flex-col shadow-sm overflow-y-auto">
      {/* Logo 区域 */}
      <Link href="/jd-business" className="h-16 border-b border-border flex items-center px-5 cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              食堂商城业务
            </h2>
            <p className="text-xs text-muted-foreground">青云通</p>
          </div>
        </div>
      </Link>

      {/* 菜单项 */}
      <nav className="p-4 flex-1">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </div>
              <ul className="space-y-1.5 mt-1">
                {group.items.map((item) => {
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
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }
                        `}
                      >
                        <span
                          className={`flex-shrink-0 ${
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
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
            </div>
          ))}
        </div>
      </nav>

      {/* 底部 */}
      <div className="p-4 border-t border-border space-y-2">
        <Link href="/jd-business">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            切换业务
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} 青云通
        </p>
      </div>
    </aside>
  );
}