"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, ArrowLeftRight, Receipt, Package, Tag, History, ShoppingCart, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * 侧边栏导航组件
 * 提供主要功能页面的导航链接
 */
export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

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
    {
      name: "采购单",
      href: "/purchase",
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      name: "发票导出",
      href: "/invoice",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      name: "发票历史",
      href: "/invoice-history",
      icon: <History className="w-5 h-5" />,
    },
    {
      name: "商品管理",
      href: "/products",
      icon: <Package className="w-5 h-5" />,
    },
    {
      name: "品牌映射",
      href: "/brands",
      icon: <Tag className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="bg-card border-r border-border w-64 min-h-screen flex flex-col shadow-sm">
      {/* Logo 区域 */}
      <div className="h-16 border-b border-border flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
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
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      <div className="p-4 border-t border-border space-y-2">
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
          © {new Date().getFullYear()} JD Bill Filter
        </p>
      </div>
    </aside>
  );
}
