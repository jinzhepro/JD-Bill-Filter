"use client";

import { useLoading } from "@/context/LoadingContext";
import { ProcessingState } from "./LoadingStates";
import { useSyncExternalStore } from "react";

/**
 * 全局 Loading Overlay 组件
 * 在应用顶层显示 loading 状态
 */
function getServerSnapshot() {
  return false;
}

function getClientSnapshot() {
  return true;
}

function subscribe() {
  return () => {};
}

export default function LoadingOverlay() {
  const { isLoading, message, progress } = useLoading();

  // 使用 useSyncExternalStore 避免 hydration 不匹配
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) return null;

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <ProcessingState progress={progress} message={message} />
    </div>
  );
}
