"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { AlertCircle } from "lucide-react";


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
    "2xl": "max-w-6xl",
    "3xl": "max-w-7xl",
    full: "max-w-full mx-4",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${sizeClasses[size]} p-0`}>
        {(title || showCloseButton) && (
          <DialogHeader className="p-6 border-b border-border">
            {title && (
              <DialogTitle className="text-lg font-semibold text-foreground">
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

// 错误对话框组件
export function ErrorModal({ isOpen, onClose, title = "错误提示", message }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <div className="text-center p-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle className="text-lg font-medium text-foreground mb-2">
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose}>确定</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
