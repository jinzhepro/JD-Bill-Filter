"use client";

import React from "react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * 通用加载状态骨架屏组件
 */
export function LoadingSkeleton({ type = "default" }) {
  if (type === "table") {
    return (
      <div className="space-y-6">
        {/* 返回按钮和标题 */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
          <div></div>
        </div>

        {/* 数据展示区域 */}
        <div className="bg-card rounded-lg border border-border p-6">
          {/* 统计信息 */}
          <div className="mb-6">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6 flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>

          {/* 表格 */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/80 p-3 border-b border-border">
              <div className="flex gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 flex gap-4">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "upload") {
    return (
      <section className="bg-card rounded-lg border border-border p-6">
        <div className="text-center">
          {/* 拖拽区域 */}
          <div className="border-2 border-dashed border-border rounded-lg p-10 bg-muted/50">
            <div className="flex justify-center mb-4">
              <Skeleton className="w-16 h-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-4" />
            <Skeleton className="h-10 w-32 mx-auto" />
          </div>

          {/* 提示信息 */}
          <div className="mt-6">
            <Skeleton className="h-4 w-56 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto mt-2" />
            <Skeleton className="h-4 w-48 mx-auto mt-2" />
          </div>
        </div>
      </section>
    );
  }

  // default
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-8 w-48" />
        <div></div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

/**
 * 处理中状态组件
 */
export function ProcessingState({ progress = 0, message = "处理中..." }) {
  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button variant="outline" disabled>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">处理中...</h1>
        <div></div>
      </div>

      {/* 处理状态 */}
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="text-center py-8">
          {/* 加载动画 */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* 进度条 */}
          <div className="max-w-md mx-auto mb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </div>

          {/* 进度百分比 */}
          <p className="text-3xl font-bold text-primary">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
