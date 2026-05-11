"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, ArrowLeftRight, Receipt, Package, Tag, ShoppingCart, LogOut, ChevronDown, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * 侧边栏导航组件
 * 提供主要功能页面的导航链接
 */
export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const groups = [
    {
      title: "结算相关",
      items: [
        {
          name: "结算单处理",
          href: "/",
          icon: <FileSpreadsheet className="w-5 h-5" />,
        },
        {
          name: "采购单",
          href: "/purchase",
          icon: <ShoppingCart className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "发票管理",
      items: [
        {
          name: "发票导出",
          href: "/invoice",
          icon: <Receipt className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "商品管理",
      items: [
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
      ],
    },
    {
      title: "供应商管理",
      items: [
        {
          name: "供应商转换",
          href: "/suppliers",
          icon: <ArrowLeftRight className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "其他管理",
      items: [
        {
          name: "食堂采购单",
          href: "/canteen-purchase",
          icon: <ShoppingBag className="w-5 h-5" />,
        },
      ],
    },
  ];

  // 每个分组的展开状态，默认全部展开
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    groups.forEach((group) => {
      initial[group.title] = true;
    });
    return initial;
  });

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

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
              电商业务结算助手
            </h2>
            <p className="text-xs text-muted-foreground">青云通</p>
          </div>
        </div>
      </div>

      {/* 菜单项 */}
      <nav className="p-4 flex-1">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full px-4 py-1 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{group.title}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedGroups[group.title] ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              {expandedGroups[group.title] && (
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
              )}
            </div>
          ))}
        </div>
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
          © {new Date().getFullYear()} 青云通
        </p>
      </div>
    </aside>
  );
}
