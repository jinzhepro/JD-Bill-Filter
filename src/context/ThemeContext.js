"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * 主题Context - 管理全局暗黑模式状态
 */
const ThemeContext = createContext();

/**
 * 主题主题类型定义
 */
export const ThemeType = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
};

/**
 * 主题Reducer - 处理主题状态变更
 */
function themeReducer(state, action) {
  switch (action.type) {
    case "SET_THEME":
      return { ...state, theme: action.payload };
    case "TOGGLE_THEME":
      return {
        ...state,
        theme: state.theme === ThemeType.LIGHT ? ThemeType.DARK : ThemeType.LIGHT,
      };
    default:
      return state;
  }
}

/**
 * 初始化主题状态 - 从localStorage读取用户偏好
 */
function getInitialTheme() {
  if (typeof window !== "undefined") {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      return storedTheme;
    }

    // 检查系统主题偏好
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? ThemeType.DARK
      : ThemeType.LIGHT;
    
    return systemTheme;
  }
  
  return ThemeType.LIGHT;
}

/**
 * 主题Context Provider组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 */
/**
 * 客户端挂载检测Hook
 */
function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIsClient(true), []);
  return isClient;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const isClient = useIsClient();

  /**
   * 应用主题到DOM
   */
  const applyTheme = (themeValue) => {
    if (!isClient) return;
    
    const root = document.documentElement;
    
    if (themeValue === ThemeType.DARK) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // 保存到localStorage
    localStorage.setItem("theme", themeValue);
  };

  /**
   * 设置主题
   * @param {string} newTheme - 新主题
   */
  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  /**
   * 切换主题（明暗模式切换）
   */
  const handleToggleTheme = () => {
    const newTheme = theme === ThemeType.LIGHT ? ThemeType.DARK : ThemeType.LIGHT;
    handleSetTheme(newTheme);
  };

  /**
   * 响应主题变化
   */
  useEffect(() => {
    if (!isClient) return;
    
    const root = document.documentElement;
    
    if (theme === ThemeType.DARK) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    localStorage.setItem("theme", theme);
  }, [theme, isClient]);

  /**
   * 监听系统主题变化
   */
  useEffect(() => {
    if (!isClient) return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e) => {
      // 只有当用户选择"跟随系统"时才响应
      if (theme === ThemeType.SYSTEM) {
        const systemTheme = e.matches ? ThemeType.DARK : ThemeType.LIGHT;
        
        const root = document.documentElement;
        if (systemTheme === ThemeType.DARK) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, isClient]);

  /**
   * Context值对象
   */
  const value = {
    theme,
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    isDark: theme === ThemeType.DARK,
    isLight: theme === ThemeType.LIGHT,
    mounted: isClient,
  };

  // 始终提供Context，确保服务端和客户端HTML结构一致
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * 使用主题Context的Hook
 * @returns {Object} 主题Context值
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}

/**
 * 获取当前主题的CSS类名
 * @param {string} lightClass - 亮色模式CSS类名
 * @param {string} darkClass - 暗色模式CSS类名
 * @returns {string} 对应当前主题的CSS类名
 */
export function getThemeClass(lightClass, darkClass) {
  // 这里会在运行时通过useTheme hook获取实际主题
  return lightClass; // 实际使用时需要通过useTheme hook
}

export default ThemeContext;