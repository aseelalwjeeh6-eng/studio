'use client';
import { toast as hotToast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import React from 'react';

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "destructive";
  duration?: number;
  id?: string;
};

const toast = ({ title, description, action, variant, duration, id }: ToastProps) => {
    const toastId = id || Math.random().toString();

    const toastContent = (
    <div className="flex flex-col gap-1 items-start text-right w-full">
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm">{description}</div>}
      {action && (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => {
            action.onClick();
            hotToast.dismiss(toastId);
          }} 
          className="mt-2"
        >
            {action.label}
        </Button>
      )}
    </div>
  );

  const options = {
    id: toastId,
    duration: duration || (action ? 10000 : (variant === 'destructive' ? 6000 : 4000)),
  };

  if (variant === 'destructive') {
    hotToast.error(toastContent, options);
  } else {
    hotToast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-in fade-in' : 'animate-out fade-out'
        } max-w-md w-full bg-card shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          {toastContent}
        </div>
        <div className="flex border-l border-border">
          <button
            onClick={() => hotToast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            إغلاق
          </button>
        </div>
      </div>
    ), options);
  }
};

const useToast = () => {
    return { toast };
}

export { useToast, toast };
