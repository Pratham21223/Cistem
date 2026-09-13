import { Moon, Pencil, Redo2, Sun, Undo2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import { useProjectStore } from "@/stores/projectStore";

export function TopBar() {
  const projectName = useProjectStore((state) => state.projectName);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const theme = useProjectStore((state) => state.uiPreferences.theme);
  const toggleTheme = useProjectStore((state) => state.toggleTheme);
  const canUndo = useCanvasStore((state) => state.past.length > 0);
  const canRedo = useCanvasStore((state) => state.future.length > 0);
  const hasLocalChanges = useCanvasStore(
    (state) => state.past.length > 0 || state.future.length > 0,
  );
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const [draftName, setDraftName] = useState<string | null>(null);

  const commitName = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length > 0) setProjectName(trimmed);
    setDraftName(null);
  };

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-foreground shadow-xs">
          <span className="font-hand text-[19px] font-bold leading-none">C</span>
        </span>
        <span className="text-display leading-none text-text-primary">Cistem</span>
      </div>

      <Separator orientation="vertical" className="mx-1.5 h-5" />

      {draftName !== null ? (
        <Input
          className="h-7 w-52"
          value={draftName}
          autoFocus
          aria-label="Project name"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={(event) => commitName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setDraftName(null);
          }}
        />
      ) : (
        <button
          type="button"
          className="group/title flex h-7 max-w-56 items-center gap-1.5 rounded-lg px-2 text-control text-text-secondary transition-colors duration-fast hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Double-click to rename"
          onDoubleClick={() => setDraftName(projectName)}
        >
          <span className="truncate">{projectName}</span>
          <Pencil
            size={12}
            strokeWidth={1.75}
            className="shrink-0 opacity-0 transition-opacity duration-fast group-hover/title:opacity-70"
            aria-hidden
          />
        </button>
      )}

      <div className="ml-1 flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo · ⌘Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Redo"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo · ⇧⌘Z</TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-caption text-text-secondary">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-warning",
              hasLocalChanges && "animate-pulse",
            )}
            aria-hidden
          />
          Local · autosave in P3
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun size={16} strokeWidth={1.75} />
              ) : (
                <Moon size={16} strokeWidth={1.75} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" />

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <Button variant="ghost" size="sm" disabled title="Rule-based review arrives in Phase P5">
            Review
          </Button>
          <Button variant="ghost" size="sm" disabled title="Prompt generation arrives in Phase P4">
            Generate prompt
          </Button>
        </div>

        <span className={cn("inline-flex rounded-lg", hasLocalChanges && "animate-save-glow")}>
          <Button variant="primary" size="sm" disabled title="Cloud saving arrives in Phase P9">
            Save to Cloud
          </Button>
        </span>
      </div>
    </header>
  );
}
