import { useReactFlow, useViewport } from "@xyflow/react";
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanvasStore } from "@/stores/canvasStore";

/** Bottom dock: viewport controls plus history, mirroring Excalidraw's control cluster. */
export function CanvasControls() {
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const canUndo = useCanvasStore((state) => state.past.length > 0);
  const canRedo = useCanvasStore((state) => state.future.length > 0);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);

  return (
    <div
      role="toolbar"
      aria-label="Canvas controls"
      className="island pointer-events-auto absolute bottom-3 left-1/2 z-20 flex h-11 -translate-x-1/2 items-center gap-0.5 px-1.5"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => void zoomOut()}>
            <ZoomOut size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>

      <span
        className="w-12 text-center font-mono text-caption text-text-secondary"
        aria-live="polite"
        aria-label="Zoom level"
      >
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => void zoomIn()}>
            <ZoomIn size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom to fit"
            onClick={() => void fitView({ padding: 0.2 })}
          >
            <Maximize size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom to fit</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}>
            <Undo2 size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo · ⌘Z</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}>
            <Redo2 size={16} strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo · ⇧⌘Z</TooltipContent>
      </Tooltip>
    </div>
  );
}
