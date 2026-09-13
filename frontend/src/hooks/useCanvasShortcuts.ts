import { useEffect } from "react";

import { TOOL_KEYS } from "@/lib/constants";
import { useCanvasStore } from "@/stores/canvasStore";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Global canvas shortcuts (ui-rules.md §5.1). Ignored while typing in any field.
 * Undo/redo, copy/paste/duplicate, delete, nudge, grouping, tools, and escape.
 */
export function useCanvasShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return;

      const store = useCanvasStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod) {
        switch (key) {
          case "z":
            event.preventDefault();
            if (event.shiftKey) store.redo();
            else store.undo();
            return;
          case "y":
            event.preventDefault();
            store.redo();
            return;
          case "c":
            event.preventDefault();
            store.copySelection();
            return;
          case "v":
            event.preventDefault();
            store.pasteClipboard();
            return;
          case "d":
            event.preventDefault();
            store.duplicateSelection();
            return;
          case "g":
            event.preventDefault();
            if (event.shiftKey) store.ungroupSelection();
            else store.groupSelection();
            return;
          case "a":
            event.preventDefault();
            store.selectAll();
            return;
          default:
            return;
        }
      }

      switch (key) {
        case "delete":
        case "backspace":
          event.preventDefault();
          store.removeSelection();
          return;
        case "escape":
          if (store.tool !== "select") store.setTool("select");
          else store.clearSelection();
          return;
        case "arrowup":
          event.preventDefault();
          store.nudgeSelection(0, event.shiftKey ? -10 : -1);
          return;
        case "arrowdown":
          event.preventDefault();
          store.nudgeSelection(0, event.shiftKey ? 10 : 1);
          return;
        case "arrowleft":
          event.preventDefault();
          store.nudgeSelection(event.shiftKey ? -10 : -1, 0);
          return;
        case "arrowright":
          event.preventDefault();
          store.nudgeSelection(event.shiftKey ? 10 : 1, 0);
          return;
        default:
          break;
      }

      const tool = TOOL_KEYS[key];
      if (tool && !event.altKey) {
        event.preventDefault();
        store.setTool(tool);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
