import { ChevronDown, Moon, Pencil, Sun } from "lucide-react";
import { useState } from "react";

import { ProjectMenu } from "@/components/project/ProjectMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { renameActiveProject } from "@/services/session";
import { useProjectStore } from "@/stores/projectStore";

function formatSavedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TopBar() {
  const projectName = useProjectStore((state) => state.projectName);
  const theme = useProjectStore((state) => state.uiPreferences.theme);
  const toggleTheme = useProjectStore((state) => state.toggleTheme);
  const isOnline = useProjectStore((state) => state.isOnline);
  const isSaving = useProjectStore((state) => state.isSaving);
  const isDirty = useProjectStore((state) => state.isDirty);
  const saveError = useProjectStore((state) => state.saveError);
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const commitName = (value: string): void => {
    void renameActiveProject(value).catch(() => undefined);
    setDraftName(null);
  };

  const status = saveError
    ? { label: "Save failed", dot: "bg-critical", title: saveError }
    : !isOnline
      ? {
          label: "Offline",
          dot: "bg-warning",
          title: "Offline — changes are saved to this browser only.",
        }
      : isSaving
        ? { label: "Saving…", dot: "bg-warning animate-pulse", title: undefined }
        : isDirty
          ? { label: "Unsaved changes", dot: "bg-warning animate-pulse", title: undefined }
          : {
              label: lastSavedAt
                ? `Saved locally · ${formatSavedTime(lastSavedAt)}`
                : "Local draft",
              dot: "bg-success",
              title: "Stored in this browser. Cloud saving arrives in Phase P9.",
            };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3">
      <div className="island pointer-events-auto relative flex h-11 items-center gap-1 py-1 pl-1.5 pr-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground">
          <span className="text-panel-title leading-none">C</span>
        </span>
        <span className="hidden pr-1 text-panel-title leading-none text-text-primary sm:inline">
          Cistem
        </span>

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
            className="group/title focus-ring flex h-8 max-w-56 items-center gap-1.5 rounded-md px-2 text-control text-text-secondary transition-colors duration-fast hover:bg-surface-secondary hover:text-text-primary"
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

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Projects"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </Button>

        <ProjectMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>

      <div className="island pointer-events-auto flex h-11 items-center gap-1 px-1.5">
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-1.5 text-caption text-text-muted"
          title={status.title}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden />
          {status.label}
        </span>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="primary" size="md" disabled>
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cloud saving arrives in Phase P9</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
