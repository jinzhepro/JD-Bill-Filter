"use client";
import { SimpleLayout } from "@/components/SimpleLayout";
import { CanteenManager } from "@/components/CanteenManager";

export default function CanteenPage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">食堂管理</h1>
        <p className="text-muted-foreground">管理食堂信息，包括名称和位置</p>
        <CanteenManager />
      </div>
    </SimpleLayout>
  );
}