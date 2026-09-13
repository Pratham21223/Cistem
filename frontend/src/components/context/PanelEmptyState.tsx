import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TILE_TONES = {
  info: { back: "bg-surface-secondary", front: "bg-pastel-blue text-cat-networking" },
  success: { back: "bg-surface-secondary", front: "bg-pastel-green text-success" },
  violet: { back: "bg-surface-secondary", front: "bg-pastel-violet text-cat-compute" },
  warning: { back: "bg-surface-secondary", front: "bg-pastel-yellow text-warning" },
} as const;

export type PanelEmptyStateTone = keyof typeof TILE_TONES;

type PanelEmptyStateProps = {
  icon: LucideIcon;
  tone?: PanelEmptyStateTone;
  title: string;
  children: ReactNode;
};

/**
 * Shared right-panel empty state: a light two-tile illustration, an accent-font headline,
 * and body copy with comfortable line height. Tabs pass tailored content, not generic text.
 */
export function PanelEmptyState({
  icon: Icon,
  tone = "info",
  title,
  children,
}: PanelEmptyStateProps) {
  const tile = TILE_TONES[tone];

  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <div className="relative mb-2 h-14 w-16" aria-hidden>
        <span
          className={cn(
            "absolute left-0 top-1.5 h-11 w-11 -rotate-6 rounded-lg border border-border",
            tile.back,
          )}
        />
        <span
          className={cn(
            "absolute right-0 top-0 grid h-11 w-11 rotate-3 place-items-center rounded-lg shadow-xs",
            tile.front,
          )}
        >
          <Icon size={22} strokeWidth={1.75} />
        </span>
      </div>
      <h3 className="text-panel-title text-text-primary">{title}</h3>
      <div className="mt-2 max-w-[32ch] text-body text-text-secondary">{children}</div>
    </div>
  );
}
