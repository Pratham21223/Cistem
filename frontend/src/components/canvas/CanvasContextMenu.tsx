import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";

export type CanvasContextMenuState = {
  x: number;
  y: number;
  nodeId: string | null;
};

type CanvasContextMenuProps = {
  state: CanvasContextMenuState;
  onClose: () => void;
  onAddComment: (nodeId: string) => void;
};

export function CanvasContextMenu({ state, onClose, onAddComment }: CanvasContextMenuProps) {
  const duplicateSelection = useCanvasStore((store) => store.duplicateSelection);
  const removeSelection = useCanvasStore((store) => store.removeSelection);
  const removeEdges = useCanvasStore((store) => store.removeEdges);
  const pasteClipboard = useCanvasStore((store) => store.pasteClipboard);
  const selectAll = useCanvasStore((store) => store.selectAll);

  useEffect(() => {
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
  }, [onClose]);

  const items: { label: string; shortcut?: string; onSelect: () => void; destructive?: boolean }[] =
    state.nodeId
      ? [
          { label: "Duplicate", shortcut: "⌘D", onSelect: duplicateSelection },
          { label: "Add comment", onSelect: () => onAddComment(state.nodeId ?? "") },
          {
            label: "Delete",
            shortcut: "⌫",
            destructive: true,
            onSelect: () => {
              const selectedEdgeIds = useCanvasStore
                .getState()
                .edges.filter((edge) => edge.selected)
                .map((edge) => edge.id);
              removeSelection();
              if (selectedEdgeIds.length > 0) removeEdges(selectedEdgeIds);
            },
          },
        ]
      : [
          { label: "Paste", shortcut: "⌘V", onSelect: pasteClipboard },
          { label: "Select all", shortcut: "⌘A", onSelect: selectAll },
        ];

  return (
    <div
      role="menu"
      aria-label="Canvas context menu"
      className="fixed z-40 min-w-44 rounded-xl border border-border bg-surface p-1 shadow-md"
      style={{ left: state.x, top: state.y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={cn(
            "flex h-8 w-full items-center justify-between gap-4 rounded-lg px-2.5 text-left text-control transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
            item.destructive
              ? "text-critical hover:bg-critical-muted focus-visible:bg-critical-muted"
              : "text-text-primary hover:bg-surface-secondary focus-visible:bg-surface-secondary",
          )}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          <span>{item.label}</span>
          {item.shortcut ? (
            <span className="text-[11px] text-text-faint">{item.shortcut}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
