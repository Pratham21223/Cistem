import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-micro font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface-secondary text-text-secondary",
        accent: "border-accent-light bg-accent-muted text-accent",
        info: "border-info-light bg-info-muted text-info",
        suggestion: "border-suggestion-light bg-suggestion-muted text-suggestion",
        warning: "border-warning-light bg-warning-muted text-warning",
        critical: "border-critical-light bg-critical-muted text-critical",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
