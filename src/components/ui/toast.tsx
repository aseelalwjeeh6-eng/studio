"use client"

import * as React from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { X } from "lucide-react"
import { Toaster as HotToaster, toast as hotToast } from "react-hot-toast"

import { cn } from "@/lib/utils"
import { Button } from "./button"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "destructive";
  duration?: number;
};

const toast = ({ title, description, action, variant, duration }: ToastProps) => {
    const toastContent = (
    <div className="flex flex-col gap-1 items-start">
      {title && <div className="font-semibold text-right">{title}</div>}
      {description && <div className="text-sm text-right">{description}</div>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-2">
            {action.label}
        </Button>
      )}
    </div>
  );

  const options = {
    duration: duration || (variant === 'destructive' ? 6000 : 4000),
  };

  if (variant === 'destructive') {
    hotToast.error(toastContent, options);
  } else {
    hotToast.success(toastContent, options);
  }
};

const useToast = () => {
    return { toast };
}

export { useToast, toast };
