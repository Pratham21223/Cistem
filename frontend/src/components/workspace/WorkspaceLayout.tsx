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
      <div className="relative h-full w-full overflow-hidden bg-canvas">
        <main aria-label="Canvas workspace" className="absolute inset-0">
          <CanvasArea />
        </main>

        <TopBar />
        <LeftSidebar />
        <ContextPanel />

        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-50 hidden justify-center px-3 max-md:flex">
          <p className="island px-4 py-2 text-body text-text-secondary">
            Cistem is designed for desktop — resize your window to keep designing.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
