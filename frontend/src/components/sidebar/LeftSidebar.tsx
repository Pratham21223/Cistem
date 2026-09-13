import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-surface shadow-sm transition-[width] duration-base ease-standard",
        collapsed ? "w-12" : "w-[264px]",
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        {collapsed ? null : <h2 className="text-panel-title text-text-primary">Components</h2>}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "Expand component library" : "Collapse component library"}
          aria-expanded={!collapsed}
          onClick={toggleLeftPanel}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.75} />
          )}
        </Button>
      </header>

      {collapsed ? null : <ComponentLibrary />}
    </aside>
  );
}
