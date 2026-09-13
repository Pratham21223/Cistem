import { Compass, FileText, PanelRightClose, PanelRightOpen, ShieldAlert } from "lucide-react";

import { ContextOverview } from "@/components/context/ContextOverview";
import { PromptPreview } from "@/components/context/PromptPreview";
import { ReviewPanel } from "@/components/context/ReviewPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

  if (collapsed) {
    return (
      <aside
        aria-label="Context panel"
        className="flex w-11 shrink-0 flex-col items-center gap-1 border-l border-border bg-surface py-2 shadow-sm transition-[width] duration-base ease-standard"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Expand context panel"
          aria-expanded={false}
          onClick={toggleRightPanel}
        >
          <PanelRightOpen size={16} strokeWidth={1.75} />
        </Button>
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === item.value ? "primary" : "ghost"}
                  size="icon-sm"
                  aria-label={item.label}
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
      </aside>
    );
  }

  return (
    <aside
      aria-label="Context panel"
      className="flex w-[360px] shrink-0 flex-col border-l border-border bg-surface shadow-sm transition-[width] duration-base ease-standard"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
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
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveRightTab(value as RightPanelTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="shrink-0 px-3">
          {TAB_ITEMS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
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
    </aside>
  );
}
