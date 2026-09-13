import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring flex min-h-16 w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-control text-text-primary transition-colors duration-fast placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
