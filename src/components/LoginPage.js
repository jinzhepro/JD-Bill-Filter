"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { createUserTable } from "@/lib/mysqlConnection";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitLoading, setIsInitLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useApp();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "登录失败",
        description: "请输入用户名和密码",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "login",
          username,
          password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "登录成功",
          description: `欢迎回来，${
            result.user.realName || result.user.username
          }！`,
        });

        // 先更新状态
        login(result.user);

        // 然后直接跳转，不依赖回调
        router.push("/");
      } else {
        toast({
          title: "登录失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("登录请求失败:", error);
      toast({
        title: "登录失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitUserTable = async () => {
    setIsInitLoading(true);

    try {
      const result = await createUserTable();

      if (result.success) {
        toast({
          title: "用户表初始化成功",
          description: result.message,
        });
      } else {
        toast({
          title: "用户表初始化失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("用户表初始化请求失败:", error);
      toast({
        title: "用户表初始化失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsInitLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            京东万商库存管理系统
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请使用您的账户登录
          </p>
        </div>

        <Card className="p-6">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                用户名
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                密码
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "登录中..." : "登录"}
              </Button>
            </div>
          </form>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleInitUserTable}
              disabled={isInitLoading || isLoading}
            >
              {isInitLoading ? "初始化中..." : "初始化用户表"}
            </Button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              首次使用系统时，请点击此按钮创建用户表和默认管理员账户
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
