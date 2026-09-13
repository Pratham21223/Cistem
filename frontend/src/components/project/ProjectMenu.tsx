import { Check, Clock, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";

import {
  createNewProject,
  listActiveSnapshots,
  restoreSnapshot,
  saveSnapshotNow,
  switchProject,
} from "@/services/session";
import type { SnapshotRecord } from "@/services/persistence";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";

type ProjectMenuProps = {
  open: boolean;
  onClose: () => void;
};

const ITEM_CLASSNAME =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-control transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Guest project list, new-project flow, and local snapshots (`build-plan.md` §8). */
export function ProjectMenu({ open, onClose }: ProjectMenuProps) {
  const projects = useProjectStore((state) => state.projects);
  const projectId = useProjectStore((state) => state.projectId);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listActiveSnapshots()
      .then((list) => {
        if (!cancelled) setSnapshots(list);
      })
      .catch(() => {
        if (!cancelled) setSnapshots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (): void => onClose();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="menu"
      aria-label="Projects"
      className="panel-surface absolute left-0 top-12 z-50 flex w-80 flex-col overflow-hidden p-1.5 animate-in fade-in-0 zoom-in-95"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="px-2 pb-1 pt-1.5 text-eyebrow text-text-muted">Projects</p>

      <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
        {projects.map((project) => {
          const active = project.id === projectId;
          return (
            <li key={project.id}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cn(
                  ITEM_CLASSNAME,
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-text-primary hover:bg-surface-secondary focus-visible:bg-surface-secondary",
                )}
                onClick={() => {
                  void switchProject(project.id).catch(() => undefined);
                  onClose();
                }}
              >
                <Check
                  size={14}
                  strokeWidth={2}
                  className={cn("shrink-0", active ? "text-accent" : "text-transparent")}
                  aria-hidden
                />
                <span className="flex-1 truncate">{project.name}</span>
                <span className="shrink-0 text-micro text-text-faint">
                  {formatTimestamp(project.updatedAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className={cn(ITEM_CLASSNAME, "text-text-primary hover:bg-surface-secondary")}
        onClick={() => {
          void createNewProject().catch(() => undefined);
          onClose();
        }}
      >
        <Plus size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden />
        <span className="flex-1">New blank design</span>
      </button>

      <div className="mx-2 my-1 h-px bg-border" aria-hidden />

      <button
        type="button"
        className={cn(ITEM_CLASSNAME, "text-text-primary hover:bg-surface-secondary")}
        onClick={() => {
          void saveSnapshotNow()
            .then(() => listActiveSnapshots())
            .then(setSnapshots)
            .catch(() => undefined);
        }}
      >
        <Save size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden />
        <span className="flex-1">Save snapshot</span>
      </button>

      {snapshots.length === 0 ? (
        <p className="px-2 py-1.5 text-caption text-text-muted">No snapshots yet.</p>
      ) : (
        <>
          <p className="px-2 pb-1 pt-1.5 text-eyebrow text-text-muted">Snapshots</p>
          <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {snapshots.slice(0, 8).map((snapshot) => (
              <li key={snapshot.id}>
                <button
                  type="button"
                  className={cn(ITEM_CLASSNAME, "text-text-secondary hover:bg-surface-secondary")}
                  onClick={() => {
                    void restoreSnapshot(snapshot.id).catch(() => undefined);
                    onClose();
                  }}
                >
                  <Clock size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden />
                  <span className="flex-1 truncate text-text-primary">{snapshot.label}</span>
                  <span className="shrink-0 text-micro text-text-faint">Restore</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
