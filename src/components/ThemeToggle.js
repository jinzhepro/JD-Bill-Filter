"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "./ui/button";
import { Sun, Moon } from "lucide-react";

/**
 * 主题切换按钮组件
 * 集成ThemeContext，提供全局主题状态管理
 * @param {Function} toggleTheme - 切换主题的函数
 * @param {boolean} isDark - 是否为暗色模式
 * @param {boolean} mounted - 是否已挂载
 */
export function ThemeToggle() {
  const { toggleTheme, isDark, mounted } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={mounted ? toggleTheme : undefined}
      className="w-10 h-10 p-0 rounded-xl transition-all duration-200 hover:bg-muted hover:shadow-md"
      title={mounted ? (isDark ? "切换到亮色模式" : "切换到暗色模式") : "切换主题"}
      aria-label={mounted ? (isDark ? "切换到亮色模式" : "切换到暗色模式") : "切换主题"}
      disabled={!mounted}
    >
      {mounted ? (
        isDark ? (
          // 太阳图标（亮色模式）
          <div className="relative">
            <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-180 text-amber-500" />
          </div>
        ) : (
          // 月亮图标（暗色模式）
          <div className="relative">
            <Moon className="w-5 h-5 transition-transform duration-300 hover:scale-110 text-slate-600" />
          </div>
        )
      ) : (
        // 占位符图标，确保服务端和客户端HTML结构一致
        <div className="w-5 h-5" />
      )}
      <span className="sr-only">
        {mounted 
          ? (isDark ? "当前为暗色模式，点击切换到亮色模式" : "当前为亮色模式，点击切换到暗色模式")
          : "切换主题"
        }
      </span>
    </Button>
  );
}

/**
 * 高级主题选择器组件
 * 提供亮色、暗色、跟随系统三种模式选择
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "亮色", icon: "☀️" },
    { value: "dark", label: "暗色", icon: "🌙" },
    { value: "system", label: "跟随系统", icon: "💻" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
            transition-all duration-200 ease-in-out
            ${
              theme === themeOption.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
          aria-label={`选择${themeOption.label}主题`}
        >
          <span className="text-base">{themeOption.icon}</span>
          <span className="hidden sm:inline">{themeOption.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
