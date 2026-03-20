/**
 * 确认对话框组件
 * [INPUT]: 依赖 @/components/ui/dialog 的 Dialog 组件，@/components/ui/button
 * [OUTPUT]: 提供 ConfirmDialog 对话框组件
 * [POS]: components/ui/confirm-dialog.tsx - 通用确认对话框
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 border-0"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-500 border-0"
      : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant !== "default" && (
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  variant === "danger"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button className={confirmButtonClass} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "处理中..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
