import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-40 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-caption font-medium text-text-primary shadow-md animate-in fade-in-0 zoom-in-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export function ShortcutHint({ children }: { children: string }) {
  return (
    <kbd className="rounded-xs border border-border bg-surface-secondary px-1 py-px font-mono text-[10px] text-text-muted">
      {children}
    </kbd>
  );
}
