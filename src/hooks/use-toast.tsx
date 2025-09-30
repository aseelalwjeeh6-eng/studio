'use client';
import { toast as hotToast } from 'react-hot-toast';
import type { ToastActionElement } from "@/components/ui/toast";

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

const toast = ({ title, description, action, variant }: ToastProps) => {
    const toastContent = (
    <div className="flex flex-col gap-1">
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm">{description}</div>}
      {action}
    </div>
  );

  if (variant === 'destructive') {
    hotToast.error(toastContent);
  } else {
    hotToast.success(toastContent);
  }
};

const useToast = () => {
    return { toast };
}

export { useToast, toast };
