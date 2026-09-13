import { Compass, FileText, PanelRightClose, PanelRightOpen, ShieldAlert } from "lucide-react";

import { ContextOverview } from "@/components/context/ContextOverview";
import { PromptPreview } from "@/components/context/PromptPreview";
import { ReviewPanel } from "@/components/context/ReviewPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import type { RightPanelTab } from "@/types/project";

const TAB_ITEMS: { value: RightPanelTab; label: string; icon: typeof Compass }[] = [
  { value: "context", label: "Context", icon: Compass },
  { value: "review", label: "Review", icon: ShieldAlert },
  { value: "prompt", label: "Prompt", icon: FileText },
];

export function ContextPanel() {
  const collapsed = useProjectStore((state) => state.uiPreferences.rightPanelCollapsed);
  const activeTab = useProjectStore((state) => state.uiPreferences.activeRightTab);
  const setActiveRightTab = useProjectStore((state) => state.setActiveRightTab);
  const toggleRightPanel = useProjectStore((state) => state.toggleRightPanel);

  return (
    <aside
      aria-label="Context panel"
      className="pointer-events-none absolute bottom-3 right-3 top-16 z-30 flex w-90 max-w-[calc(100vw-1.5rem)] flex-col items-end"
    >
      <div
        className={cn(
          "panel-surface pointer-events-auto flex h-full w-full flex-col overflow-hidden transition-all duration-base ease-standard",
          collapsed && "pointer-events-none invisible translate-x-2 opacity-0",
        )}
        inert={collapsed || undefined}
        aria-hidden={collapsed}
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
          <h2 className="text-panel-title text-text-primary">Understanding</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse context panel"
            aria-expanded
            onClick={toggleRightPanel}
          >
            <PanelRightClose size={16} strokeWidth={1.75} />
          </Button>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveRightTab(value as RightPanelTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="border-b border-border">
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.value} value={item.value}>
                  <Icon size={14} strokeWidth={1.75} aria-hidden />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="context" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <ContextOverview />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="review" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <ReviewPanel />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="prompt" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <PromptPreview />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <div
        className={cn(
          "island pointer-events-auto flex w-11 flex-col items-center gap-1 p-1.5 transition-all duration-base ease-standard",
          !collapsed && "pointer-events-none invisible translate-x-2 opacity-0",
        )}
        inert={!collapsed || undefined}
        aria-hidden={!collapsed}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand context panel"
              aria-expanded={false}
              onClick={toggleRightPanel}
            >
              <PanelRightOpen size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open understanding</TooltipContent>
        </Tooltip>

        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          return (
            <Tooltip key={item.value}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(isActive && "bg-accent-muted text-accent")}
                  aria-label={item.label}
                  aria-pressed={isActive}
                  onClick={() => {
                    setActiveRightTab(item.value);
                    toggleRightPanel();
                  }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
