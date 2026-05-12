"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";

export default function SelectBusinessPage() {
  const router = useRouter();

  const handleSelectJD = () => {
    router.push("/jd-business");
  };

  const handleSelectCanteen = () => {
    router.push("/canteen-purchase");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">电商业务结算助手</h1>
          <p className="text-muted-foreground">请选择业务类型</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:border-primary transition-colors flex flex-col" onClick={handleSelectJD}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">京东万商业务</CardTitle>
              <CardDescription className="min-h-[40px]">
                结算单处理、供应商转换、商品管理、品牌管理、发票开具、采购单管理
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" onClick={handleSelectJD}>
                进入京东万商
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors flex flex-col" onClick={handleSelectCanteen}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">食堂商城业务</CardTitle>
              <CardDescription className="min-h-[40px]">
                食堂采购单管理、开票功能
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" onClick={handleSelectCanteen}>
                进入食堂商城
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
