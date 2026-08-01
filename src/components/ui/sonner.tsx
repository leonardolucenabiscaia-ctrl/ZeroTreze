"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-card! text-card-foreground! border-border! shadow-xl! shadow-black/40! rounded-xl!",
          description: "text-muted-foreground!",
          actionButton: "bg-gold! text-gold-foreground!",
          cancelButton: "bg-secondary! text-secondary-foreground!",
          success: "border-success/40!",
          error: "border-destructive/40!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
