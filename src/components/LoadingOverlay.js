"use client";

import { useLoading } from "@/context/LoadingContext";
import { ProcessingState } from "./LoadingStates";
import { useEffect, useState } from "react";

/**
 * 全局 Loading Overlay 组件
 * 在应用顶层显示 loading 状态
 */
export default function LoadingOverlay() {
  const { isLoading, message, progress } = useLoading();
  const [mounted, setMounted] = useState(false);

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <ProcessingState progress={progress} message={message} />
    </div>
  );
}
