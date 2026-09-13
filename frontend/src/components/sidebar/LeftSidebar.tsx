import { Library, PanelLeftClose } from "lucide-react";

import { ComponentLibrary } from "@/components/sidebar/ComponentLibrary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";

export function LeftSidebar() {
  const collapsed = useProjectStore((state) => state.uiPreferences.leftPanelCollapsed);
  const toggleLeftPanel = useProjectStore((state) => state.toggleLeftPanel);

  return (
    <aside
      aria-label="Component library"
      className="pointer-events-none absolute bottom-3 left-3 top-16 z-30 w-68 max-w-[calc(100vw-1.5rem)]"
    >
      <div
        className={cn(
          "panel-surface pointer-events-auto flex h-full flex-col overflow-hidden transition-all duration-base ease-standard",
          collapsed && "pointer-events-none invisible -translate-x-2 opacity-0",
        )}
        inert={collapsed || undefined}
        aria-hidden={collapsed}
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
          <h2 className="text-panel-title text-text-primary">Components</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse component library"
            aria-expanded
            onClick={toggleLeftPanel}
          >
            <PanelLeftClose size={16} strokeWidth={1.75} />
          </Button>
        </header>

        <ComponentLibrary />
      </div>

      <button
        type="button"
        className={cn(
          "island focus-ring pointer-events-auto grid h-11 w-11 place-items-center text-text-secondary transition-all duration-base ease-standard hover:text-text-primary",
          !collapsed && "pointer-events-none invisible -translate-x-2 opacity-0",
        )}
        aria-label="Expand component library"
        aria-expanded={!collapsed}
        aria-hidden={!collapsed}
        onClick={toggleLeftPanel}
      >
        <Library size={18} strokeWidth={1.75} />
      </button>
    </aside>
  );
}
