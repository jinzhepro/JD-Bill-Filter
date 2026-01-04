"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog.js";
import { Button } from "./button.js";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnBackdropClick = true,
}) {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${sizeClasses[size]} p-0`}>
        {(title || showCloseButton) && (
          <DialogHeader className="p-6 border-b border-gray-200">
            {title && (
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
            )}
          </DialogHeader>
        )}

        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// 确认对话框组件
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  confirmVariant = "default",
  isLoading = false,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <div className="text-center p-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <DialogTitle className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </DialogTitle>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "处理中..." : confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 错误对话框组件
export function ErrorModal({ isOpen, onClose, title = "错误提示", message }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <div className="text-center p-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <DialogTitle className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </DialogTitle>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex justify-center">
            <Button onClick={onClose}>确定</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
