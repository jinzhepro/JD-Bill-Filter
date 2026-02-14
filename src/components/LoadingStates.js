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
      <section className="bg-card rounded-xl border border-border p-8 shadow-sm">
        <div className="text-center">
          {/* 拖拽区域 */}
          <div className="border-2 border-dashed border-border rounded-xl p-12 bg-gradient-to-br from-muted/30 to-muted/50">
            <div className="flex justify-center mb-6">
              <Skeleton className="w-20 h-20 rounded-2xl" />
            </div>
            <Skeleton className="h-6 w-48 mx-auto mb-3 rounded-lg" />
            <Skeleton className="h-4 w-64 mx-auto mb-4 rounded-lg" />
            <Skeleton className="h-11 w-40 mx-auto rounded-lg" />
          </div>

          {/* 提示信息 */}
          <div className="mt-8">
            <Skeleton className="h-4 w-56 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-40 mx-auto mt-3 rounded-lg" />
            <Skeleton className="h-4 w-48 mx-auto mt-3 rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  // default
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <Skeleton className="h-6 w-32 mb-4 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * 处理中状态组件
 * @param {number} progress - 进度百分比 (0-100)
 * @param {string} message - 处理消息
 */
export function ProcessingState({ progress = 0, message = "处理中..." }) {
  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button variant="outline" disabled className="rounded-lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">处理中...</h1>
        <div></div>
      </div>

      {/* 处理状态 */}
      <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
        <div className="text-center py-8">
          {/* 加载动画 */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 flex items-center justify-center">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="max-w-md mx-auto mb-6">
            <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full shadow-sm"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 font-medium">{message}</p>
          </div>

          {/* 进度百分比 */}
          <p className="text-4xl font-bold text-primary tracking-tight">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
