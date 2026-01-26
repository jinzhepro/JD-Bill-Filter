"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";

/**
 * 错误边界组件
 * 捕获组件树中的 JavaScript 错误，显示友好的错误信息
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 记录错误到控制台
    console.error("ErrorBoundary 捕获到错误:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // 在开发环境记录重置事件
    if (process.env.NODE_ENV === 'development') {
      console.log("应用已重置");
    }
  };

  render() {
    if (this.state.hasError) {
      const { Fallback } = this.props;

      // 如果提供了自定义 Fallback 组件，使用它
      if (Fallback) {
        return <Fallback error={this.state.error} onReset={this.handleReset} />;
      }

      // 默认错误 UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="bg-card border border-destructive rounded-lg p-8 max-w-2xl w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-semibold text-destructive mb-4">
                应用程序遇到错误
              </h2>
              <p className="text-muted-foreground mb-6">
                抱歉，应用程序遇到了意外错误。请尝试刷新页面或联系技术支持。
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="bg-muted p-4 rounded-md mb-6 text-left">
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    错误详情（仅开发环境显示）
                  </h3>
                  <pre className="text-xs text-destructive overflow-auto max-h-48">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button onClick={this.handleReset} variant="outline">
                  重试
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  刷新页面
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 异步操作错误处理 Hook
 * 用于包装异步操作，统一错误处理
 */
export function useErrorHandler() {
  const { setError, addLog } = useApp();

  const handleError = React.useCallback(
    (error, context = "操作") => {
      console.error(`${context}失败:`, error);

      const errorMessage =
        error?.message || error?.toString() || "未知错误";

      // 记录错误日志
      addLog(`${context}失败: ${errorMessage}`, "error");

      // 设置错误状态
      setError(errorMessage);

      // 返回错误信息，便于调用方处理
      return errorMessage;
    },
    [setError, addLog]
  );

  const withErrorHandling = React.useCallback(
    async (asyncFn, context = "操作") => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        throw error; // 重新抛出错误，让调用方可以进一步处理
      }
    },
    [handleError]
  );

  return { handleError, withErrorHandling };
}

/**
 * 包装异步操作的 HOC
 * 自动处理错误和加载状态
 */
export function withAsyncOperation(Component) {
  return function WrappedComponent(props) {
    const { setProcessing, setError, clearError, addLog } = useApp();
    const { withErrorHandling } = useErrorHandler();

    const executeAsync = React.useCallback(
      async (asyncFn, context = "操作") => {
        setProcessing(true);
        clearError();

        try {
          return await withErrorHandling(asyncFn, context);
        } finally {
          setProcessing(false);
        }
      },
      [setProcessing, clearError, withErrorHandling]
    );

    return <Component {...props} executeAsync={executeAsync} />;
  };
}