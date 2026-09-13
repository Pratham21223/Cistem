import { ChevronRight, Search } from "lucide-react";
import { Activity, Boxes, Cpu, Database, MessagesSquare, Network, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { CATEGORY_ACCENT_CLASS, CATEGORY_FILL_CLASS, CATEGORY_LABELS } from "@/lib/canvasVisuals";
import { cn } from "@/lib/utils";
import type { ComponentCategory } from "@/types/architecture";

const CATEGORY_ORDER: ComponentCategory[] = [
  "networking",
  "compute",
  "storage",
  "messaging",
  "services",
  "observability",
  "security",
];

const CATEGORY_ICONS: Record<ComponentCategory, LucideIcon> = {
  networking: Network,
  compute: Cpu,
  storage: Database,
  messaging: MessagesSquare,
  services: Boxes,
  observability: Activity,
  security: ShieldCheck,
  unknown: Boxes,
};

const SKELETON_WIDTHS = ["w-3/4", "w-2/3", "w-1/2"];

/**
 * Sidebar skeleton for P1: category structure is in place, component data arrives with
 * the knowledge base in P2. Categories expand into skeleton rows so the future
 * interaction model is already visible.
 */
export function ComponentLibrary() {
  const [expanded, setExpanded] = useState<Set<ComponentCategory>>(new Set());

  const toggleCategory = (category: ComponentCategory): void => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <div
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-secondary px-2.5 text-text-muted"
          aria-disabled
          title="Component search arrives in Phase P2"
        >
          <Search size={14} strokeWidth={1.75} />
          <span className="flex-1 text-control">Search components</span>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-eyebrow text-text-muted">
            Soon
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {CATEGORY_ORDER.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const isOpen = expanded.has(category);
            return (
              <li key={category}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleCategory(category)}
                  className="group flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-fast hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-md shadow-xs",
                      CATEGORY_FILL_CLASS[category],
                      CATEGORY_ACCENT_CLASS[category],
                    )}
                    aria-hidden
                  >
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="flex-1 truncate text-control text-text-primary">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.75}
                    className={cn(
                      "shrink-0 text-text-faint transition-transform duration-fast",
                      isOpen && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>

                {isOpen ? (
                  <div className="mb-1.5 ml-10 mr-1 space-y-2 border-l border-border pl-3 pt-2">
                    {SKELETON_WIDTHS.map((width) => (
                      <div key={width} className="flex items-center gap-2" aria-hidden>
                        <span className="h-3.5 w-3.5 shrink-0 rounded-xs bg-surface-tertiary" />
                        <span className={cn("h-2.5 rounded-full bg-surface-tertiary", width)} />
                      </div>
                    ))}
                    <p className="pt-0.5 text-caption text-text-muted">Palette loads in Phase P2</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-border px-4 py-3">
        <p className="text-caption text-text-secondary">
          Draw freehand or drop shapes now — the component palette and knowledge base arrive in
          Phase&nbsp;P2.
        </p>
      </div>
    </div>
  );
}
