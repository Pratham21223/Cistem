import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "focus-ring flex h-8 w-full rounded-md border border-border bg-surface px-2.5 text-control text-text-primary transition-colors duration-fast placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
