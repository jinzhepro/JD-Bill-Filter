"use client";

import { createContext, useContext, useCallback, useState, useMemo } from "react";

/**
 * 全局 Loading 状态管理
 * 用于在应用任何地方显示全局 loading 状态
 */

/**
 * @typedef {Object} LoadingState
 * @property {boolean} isLoading - 是否正在加载
 * @property {string} message - loading 消息
 * @property {number} progress - 进度 0-100
 */

const LoadingContext = createContext(null);

/**
 * Loading Provider
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 */
export function LoadingProvider({ children }) {
  const [state, setState] = useState({
    isLoading: false,
    message: "",
    progress: 0,
  });

  const startLoading = useCallback((message = "加载中...", progress = 0) => {
    setState({ isLoading: true, message, progress });
  }, []);

  const updateProgress = useCallback((progress, message) => {
    setState((prev) => ({
      ...prev,
      progress,
      message: message || prev.message,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setState({ isLoading: false, message: "", progress: 0 });
  }, []);

  const value = useMemo(() => ({
    ...state,
    startLoading,
    updateProgress,
    stopLoading,
  }), [state, startLoading, updateProgress, stopLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * 使用全局 Loading 状态
 * @returns {Object} loading API
 */
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

/**
 * 高阶组件 - 为组件添加 loading 能力
 * @param {React.ComponentType} WrappedComponent - 被包装的组件
 * @returns {React.ComponentType} 包装后的组件
 */
export function withLoading(WrappedComponent) {
  return function WithLoadingComponent(props) {
    const { isLoading, startLoading, stopLoading, updateProgress } = useLoading();

    return (
      <WrappedComponent
        {...props}
        isLoading={isLoading}
        startLoading={startLoading}
        stopLoading={stopLoading}
        updateProgress={updateProgress}
      />
    );
  };
}
