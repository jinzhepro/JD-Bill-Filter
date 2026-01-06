"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";

export function UserManager() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useApp();

  // 表单状态
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    realName: "",
    role: "user",
    isActive: true,
  });

  const hasLoadedUsers = useRef(false);

  // 获取用户列表
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getUsers",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        toast({
          title: "获取用户列表失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("获取用户列表失败:", error);
      toast({
        title: "获取用户列表失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 创建用户
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast({
        title: "创建失败",
        description: "用户名和密码不能为空",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createUser",
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "创建成功",
          description: result.message,
        });
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
      } else {
        toast({
          title: "创建失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("创建用户失败:", error);
      toast({
        title: "创建失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 更新用户
  const handleUpdateUser = async (e) => {
    e.preventDefault();

    setIsCreating(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateUser",
          id: editingUser.id,
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "更新成功",
          description: result.message,
        });
        setShowEditModal(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast({
          title: "更新失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("更新用户失败:", error);
      toast({
        title: "更新失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId) => {
    if (!confirm("确定要删除这个用户吗？")) {
      return;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteUser",
          id: userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "删除成功",
          description: result.message,
        });
        fetchUsers();
      } else {
        toast({
          title: "删除失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("删除用户失败:", error);
      toast({
        title: "删除失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    }
  };

  // 重置密码
  const handleResetPassword = async (userId) => {
    const newPassword = prompt("请输入新密码：");
    if (!newPassword) {
      return;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resetPassword",
          id: userId,
          newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "密码重置成功",
          description: result.message,
        });
      } else {
        toast({
          title: "密码重置失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("重置密码失败:", error);
      toast({
        title: "密码重置失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      realName: "",
      role: "user",
      isActive: true,
    });
  };

  // 开始编辑用户
  const startEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      realName: user.realName,
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  // 打开创建用户模态框
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // 关闭模态框
  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingUser(null);
    resetForm();
  };

  useEffect(() => {
    if (hasLoadedUsers.current) return;
    hasLoadedUsers.current = true;
    fetchUsers();
  }, []);

  // 检查是否为管理员
  if (currentUser?.role !== "admin") {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">只有管理员可以访问用户管理功能</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 用户列表 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">用户列表</h3>
          <Button onClick={openCreateModal}>添加用户</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">用户名</th>
                  <th className="text-left py-2">真实姓名</th>
                  <th className="text-left py-2">角色</th>
                  <th className="text-left py-2">状态</th>
                  <th className="text-left py-2">最后登录</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.username}</td>
                    <td className="py-2">{user.realName || "-"}</td>
                    <td className="py-2">
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role === "admin" ? "管理员" : "普通用户"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                      >
                        {user.isActive ? "激活" : "禁用"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditUser(user)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          重置密码
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === currentUser.id}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 创建用户模态框 */}
      <Modal isOpen={showCreateModal} onClose={closeModals} title="添加新用户">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户名 *</label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">密码 *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="请输入密码"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">真实姓名</label>
              <Input
                value={formData.realName}
                onChange={(e) =>
                  setFormData({ ...formData, realName: e.target.value })
                }
                placeholder="请输入真实姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">角色</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModals}>
              取消
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "创建中..." : "创建用户"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal isOpen={showEditModal} onClose={closeModals} title="编辑用户">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户名</label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                新密码（留空则不修改）
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="请输入新密码"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">真实姓名</label>
              <Input
                value={formData.realName}
                onChange={(e) =>
                  setFormData({ ...formData, realName: e.target.value })
                }
                placeholder="请输入真实姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">角色</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">状态</label>
              <select
                value={formData.isActive}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.value === "true",
                  })
                }
                className="w-full p-2 border rounded"
              >
                <option value="true">激活</option>
                <option value="false">禁用</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModals}>
              取消
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "更新中..." : "更新用户"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
