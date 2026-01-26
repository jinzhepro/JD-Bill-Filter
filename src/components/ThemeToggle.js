"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "./ui/button";

/**
 * 主题切换按钮组件
 * 集成ThemeContext，提供全局主题状态管理
 */
export function ThemeToggle() {
  const { toggleTheme, isDark, mounted } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={mounted ? toggleTheme : undefined}
      className="w-9 h-9 p-0 transition-all duration-200 hover:bg-muted"
      title={mounted ? (isDark ? "切换到亮色模式" : "切换到暗色模式") : "切换主题"}
      aria-label={mounted ? (isDark ? "切换到亮色模式" : "切换到暗色模式") : "切换主题"}
      disabled={!mounted}
    >
      {mounted ? (
        isDark ? (
          // 太阳图标（亮色模式）
          <svg
            className="w-5 h-5 transition-transform duration-200 hover:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          // 月亮图标（暗色模式）
          <svg
            className="w-5 h-5 transition-transform duration-200 hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
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
