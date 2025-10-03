"use client"

import { Toaster as HotToaster, toast as toastFn, resolveValue } from "react-hot-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <HotToaster>
      {(t) => {
        const toastData = toasts.find(toast => toast.id === t.id);

        return (
          <Toast
            toast={t}
            variant={toastData?.variant}
            className={toastData?.className}
            style={toastData?.style}
          >
            <div className="grid gap-1">
              {toastData?.title && <ToastTitle>{toastData.title}</ToastTitle>}
              {toastData?.description && (
                <ToastDescription>{toastData.description}</ToastDescription>
              )}
            </div>
            {toastData?.action}
            <ToastClose onClick={() => toastFn.dismiss(t.id)} />
          </Toast>
        )
      }}
    </HotToaster>
  )
}
