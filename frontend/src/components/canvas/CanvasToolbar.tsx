import { useViewport, useReactFlow } from "@xyflow/react";
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Frame,
  Hand,
  ImagePlus,
  Maximize,
  Pencil,
  Pointer,
  Spline,
  Square,
  StickyNote,
  Tag,
  Type,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShortcutHint, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useImagePlacement } from "@/hooks/useImagePlacement";
import { TOOL_SHORTCUTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasTool } from "@/types/canvas";

type ToolItem = { tool: CanvasTool; label: string; icon: LucideIcon };

const TOOL_GROUPS: ToolItem[][] = [
  [
    { tool: "select", label: "Select", icon: Pointer },
    { tool: "hand", label: "Pan", icon: Hand },
    { tool: "frame", label: "Frame", icon: Frame },
  ],
  [
    { tool: "rectangle", label: "Rectangle", icon: Square },
    { tool: "ellipse", label: "Ellipse", icon: Circle },
    { tool: "arrow", label: "Arrow", icon: ArrowUpRight },
    { tool: "connector", label: "Connector", icon: Spline },
  ],
  [
    { tool: "pen", label: "Draw", icon: Pencil },
    { tool: "eraser", label: "Eraser", icon: Eraser },
  ],
  [
    { tool: "text", label: "Text", icon: Type },
    { tool: "label", label: "Label", icon: Tag },
    { tool: "note", label: "Sticky note", icon: StickyNote },
  ],
];

export function CanvasToolbar() {
  const tool = useCanvasStore((state) => state.tool);
  const setTool = useCanvasStore((state) => state.setTool);
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const addImage = useImagePlacement();

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void addImage(file);
    },
    [addImage],
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2">
      <div
        role="toolbar"
        aria-label="Canvas tools"
        className="pointer-events-auto flex h-11 items-center gap-0.5 rounded-2xl border border-border bg-surface p-1 shadow-md"
      >
        {TOOL_GROUPS.map((group, groupIndex) => (
          <Fragment key={groupIndex}>
            {groupIndex > 0 ? <Separator orientation="vertical" className="mx-1 h-5" /> : null}
            {group.map((item) => {
              const Icon = item.icon;
              const active = tool === item.tool;
              return (
                <Tooltip key={item.tool}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={item.label}
                      aria-pressed={active}
                      className={cn(
                        active &&
                          "bg-accent text-accent-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => setTool(item.tool)}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {item.label}
                    <ShortcutHint>{TOOL_SHORTCUTS[item.tool]}</ShortcutHint>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </Fragment>
        ))}

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Upload image"
              onClick={() => document.getElementById("cistem-image-upload")?.click()}
            >
              <ImagePlus size={17} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload image</TooltipContent>
        </Tooltip>
        <input
          id="cistem-image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <div
        role="toolbar"
        aria-label="Zoom controls"
        className="pointer-events-auto flex h-11 items-center gap-0.5 rounded-2xl border border-border bg-surface p-1 shadow-md"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              onClick={() => void zoomOut()}
            >
              <ZoomOut size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <span
          className="w-11 text-center text-caption text-text-secondary"
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
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fit view"
              onClick={() => void fitView({ padding: 0.2 })}
            >
              <Maximize size={16} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom to fit</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
