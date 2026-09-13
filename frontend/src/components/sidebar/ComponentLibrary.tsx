import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { CATEGORY_ACCENT_CLASS, CATEGORY_FILL_CLASS, CATEGORY_LABELS } from "@/lib/canvasVisuals";
import { setComponentDragData } from "@/lib/componentDrag";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/components/sidebar/categoryIcons";
import { ComponentSearch } from "@/components/sidebar/ComponentSearch";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ComponentCategory } from "@/types/architecture";
import type { KnowledgeComponent } from "@/types/knowledge";

const CATEGORY_ORDER: ComponentCategory[] = [
  "networking",
  "compute",
  "storage",
  "messaging",
  "services",
  "observability",
  "security",
];

const SKELETON_WIDTHS = ["w-3/4", "w-2/3", "w-1/2"];

/** P2 component palette: real knowledge-base data, drag-and-drop or click-to-place. */
export function ComponentLibrary() {
  const { components, status } = useKnowledgeBase();
  const requestPlacement = useCanvasStore((state) => state.requestComponentPlacement);
  const [expanded, setExpanded] = useState<Set<ComponentCategory>>(new Set(["networking"]));

  const byCategory = useMemo(() => {
    const grouped = new Map<ComponentCategory, KnowledgeComponent[]>();
    for (const component of components) {
      const list = grouped.get(component.category) ?? [];
      list.push(component);
      grouped.set(component.category, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [components]);

  const toggleCategory = (category: ComponentCategory): void => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ComponentSearch
        components={components}
        onPlace={(component) => requestPlacement(component.type)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {status === "loading" ? (
          <ul className="flex flex-col gap-0.5">
            {CATEGORY_ORDER.map((category) => (
              <li
                key={category}
                className="flex h-8 animate-pulse items-center gap-2.5 rounded-md px-2"
                aria-hidden
              >
                <span className="h-6 w-6 shrink-0 rounded-sm bg-surface-tertiary" />
                <span
                  className={cn("h-2.5 rounded-full bg-surface-tertiary", SKELETON_WIDTHS[0])}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {CATEGORY_ORDER.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const items = byCategory.get(category) ?? [];
              const isOpen = expanded.has(category);
              return (
                <li key={category}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleCategory(category)}
                    className="group focus-ring flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors duration-fast hover:bg-surface-secondary"
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-black/5",
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
                    <span className="text-micro text-text-faint">{items.length}</span>
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
                    <ul className="mb-1 ml-9 mr-1 space-y-0.5 border-l border-border pl-2 pt-1">
                      {items.map((component) => (
                        <li key={component.type}>
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => setComponentDragData(event, component)}
                            onClick={() => requestPlacement(component.type)}
                            title={component.purpose.join(" · ")}
                            className="focus-ring flex h-7 w-full items-center gap-2 rounded-md px-2 text-left transition-colors duration-fast hover:bg-surface-secondary"
                          >
                            <span className="flex-1 truncate text-control text-text-secondary hover:text-text-primary">
                              {component.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-3 py-3">
        <p className="text-caption text-text-secondary">
          Drag a component onto the canvas, or click to place it at the center.
        </p>
      </div>
    </div>
  );
}
