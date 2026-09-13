import {
  BoxSelect,
  Check,
  ClipboardPaste,
  Copy,
  MessageSquarePlus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { RELATIONSHIP_LABELS } from "@/lib/canvasVisuals";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { RelationshipType } from "@/types/architecture";

export type CanvasContextMenuState = {
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
};

type CanvasContextMenuProps = {
  state: CanvasContextMenuState;
  onClose: () => void;
  onAddComment: (nodeId: string) => void;
};

type MenuItem = {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onSelect: () => void;
  destructive?: boolean;
};

type RelationshipItem = { type: RelationshipType };

const RELATIONSHIP_ITEMS: RelationshipItem[] = [
  { type: "request_flow" },
  { type: "data_flow" },
  { type: "event_flow" },
  { type: "replication" },
  { type: "dependency" },
  { type: "annotation" },
];

const MENU_MARGIN = 8;
const ITEM_CLASSNAME =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-control transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

export function CanvasContextMenu({ state, onClose, onAddComment }: CanvasContextMenuProps) {
  const duplicateSelection = useCanvasStore((store) => store.duplicateSelection);
  const removeSelection = useCanvasStore((store) => store.removeSelection);
  const removeEdges = useCanvasStore((store) => store.removeEdges);
  const setEdgeType = useCanvasStore((store) => store.setEdgeType);
  const pasteClipboard = useCanvasStore((store) => store.pasteClipboard);
  const selectAll = useCanvasStore((store) => store.selectAll);
  const edgeType = useCanvasStore(
    (store) => store.edges.find((edge) => edge.id === state.edgeId)?.type,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: state.x, top: state.y });

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

  useLayoutEffect(() => {
    const bounds = menuRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition({
      left: Math.max(
        MENU_MARGIN,
        Math.min(state.x, window.innerWidth - bounds.width - MENU_MARGIN),
      ),
      top: Math.max(
        MENU_MARGIN,
        Math.min(state.y, window.innerHeight - bounds.height - MENU_MARGIN),
      ),
    });
  }, [state.x, state.y]);

  const items: (MenuItem | { separator: true })[] = state.nodeId
    ? [
        { icon: Copy, label: "Duplicate", shortcut: "⌘D", onSelect: duplicateSelection },
        {
          icon: MessageSquarePlus,
          label: "Add comment",
          onSelect: () => onAddComment(state.nodeId ?? ""),
        },
        { separator: true },
        {
          icon: Trash2,
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
        { icon: ClipboardPaste, label: "Paste", shortcut: "⌘V", onSelect: pasteClipboard },
        { icon: BoxSelect, label: "Select all", shortcut: "⌘A", onSelect: selectAll },
      ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Canvas context menu"
      className="fixed z-40 min-w-48 rounded-lg border border-border bg-surface p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: position.left, top: position.top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {state.edgeId && edgeType ? (
        <>
          <p className="px-2 pb-1 pt-1.5 text-eyebrow text-text-muted">Connection type</p>
          {RELATIONSHIP_ITEMS.map((item, index) => {
            const active = edgeType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                autoFocus={index === 0}
                className={cn(
                  ITEM_CLASSNAME,
                  "text-text-primary hover:bg-surface-secondary focus-visible:bg-surface-secondary",
                )}
                onClick={() => {
                  setEdgeType(state.edgeId ?? "", item.type);
                  onClose();
                }}
              >
                <Check
                  size={14}
                  strokeWidth={2}
                  className={cn("shrink-0", active ? "text-accent" : "text-transparent")}
                  aria-hidden
                />
                <span className="flex-1">{RELATIONSHIP_LABELS[item.type]}</span>
              </button>
            );
          })}
        </>
      ) : (
        items.map((item, index) => {
          if ("separator" in item) {
            return (
              <div key={`separator-${index}`} className="mx-2 my-1 h-px bg-border" aria-hidden />
            );
          }
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              autoFocus={index === 0}
              className={cn(
                ITEM_CLASSNAME,
                item.destructive
                  ? "text-critical hover:bg-critical-muted focus-visible:bg-critical-muted"
                  : "text-text-primary hover:bg-surface-secondary focus-visible:bg-surface-secondary",
              )}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.75}
                className={item.destructive ? "text-critical" : "text-text-muted"}
                aria-hidden
              />
              <span className="flex-1">{item.label}</span>
              {item.shortcut ? (
                <span className="font-mono text-micro text-text-faint">{item.shortcut}</span>
              ) : null}
            </button>
          );
        })
      )}
    </div>
  );
}
