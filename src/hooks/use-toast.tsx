'use client';
import { toast as hotToast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

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
        <Button variant="secondary" size="sm" onClick={() => {
          action.onClick();
          hotToast.dismiss();
        }} className="mt-2">
            {action.label}
        </Button>
      )}
    </div>
  );

  const options = {
    duration: duration || (action ? 10000 : (variant === 'destructive' ? 6000 : 4000)),
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
