"use client"

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster 
       position="bottom-center"
       reverseOrder={false}
       toastOptions={{
          className: 'bg-card text-card-foreground border border-accent/20',
          style: {
            minWidth: '300px',
          },
        }}
    />
  )
}
