import { useEffect } from "react";

import { CanvasArea } from "@/components/canvas/CanvasArea";
import { ContextPanel } from "@/components/context/ContextPanel";
import { TopBar } from "@/components/project/TopBar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProjectStore } from "@/stores/projectStore";

export function WorkspaceLayout() {
  const theme = useProjectStore((state) => state.uiPreferences.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <LeftSidebar />
          <main className="relative min-w-0 flex-1" aria-label="Canvas workspace">
            <CanvasArea />
          </main>
          <ContextPanel />
        </div>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 hidden items-center justify-center p-3 text-center max-md:flex">
          <p className="rounded-lg bg-surface px-4 py-2 font-hand text-[16px] text-text-primary shadow-lg">
            Cistem is optimized for desktop. Resize your window to keep designing.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
