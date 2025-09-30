"use client"

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster 
       toastOptions={{
          className: 'bg-card text-card-foreground border border-accent/20 text-right',
          style: {
            minWidth: '300px',
          },
        }}
    />
  )
}
