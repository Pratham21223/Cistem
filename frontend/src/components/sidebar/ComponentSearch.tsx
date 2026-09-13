import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CATEGORY_FILL_CLASS, CATEGORY_ACCENT_CLASS } from "@/lib/canvasVisuals";
import { setComponentDragData } from "@/lib/componentDrag";
import { fuzzyFilter } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";
import type { KnowledgeComponent } from "@/types/knowledge";
import { CATEGORY_ICONS } from "@/components/sidebar/categoryIcons";

type ComponentSearchProps = {
  components: KnowledgeComponent[];
  onPlace: (component: KnowledgeComponent) => void;
};

export function ComponentSearch({ components, onPlace }: ComponentSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => fuzzyFilter(query, components, (component) => `${component.name} ${component.type}`),
    [components, query],
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative p-3 pb-2">
        <Search
          size={14}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          placeholder="Search components"
          aria-label="Search components"
          className="focus-ring h-8 w-full rounded-md border border-border bg-surface-secondary/60 pl-8 pr-8 text-control text-text-primary transition-colors duration-fast placeholder:text-text-muted"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query.length > 0) {
              event.stopPropagation();
              setQuery("");
            }
          }}
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            className="focus-ring absolute right-4 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-sm text-text-muted hover:text-text-primary"
            onClick={() => setQuery("")}
          >
            <X size={12} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {query.trim().length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-caption text-text-muted">
              No components match “{query}”.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((component) => (
                <li key={component.type}>
                  <ComponentResultRow component={component} onPlace={onPlace} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ComponentResultRow({
  component,
  onPlace,
}: {
  component: KnowledgeComponent;
  onPlace: (component: KnowledgeComponent) => void;
}) {
  const Icon = CATEGORY_ICONS[component.category];
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => setComponentDragData(event, component)}
      onClick={() => onPlace(component)}
      className="focus-ring flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors duration-fast hover:bg-surface-secondary"
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-xs border border-black/5",
          CATEGORY_FILL_CLASS[component.category],
          CATEGORY_ACCENT_CLASS[component.category],
        )}
        aria-hidden
      >
        <Icon size={12} strokeWidth={2} />
      </span>
      <span className="flex-1 truncate text-control text-text-primary">{component.name}</span>
      <span className="truncate text-micro text-text-faint">{component.category}</span>
    </button>
  );
}
