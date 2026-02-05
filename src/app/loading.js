import { LoadingSkeleton } from "@/components/LoadingStates";

/**
 * Suspense Fallback 组件
 * 在异步内容加载时显示骨架屏
 */
export default function Loading() {
  return <LoadingSkeleton type="default" />;
}
