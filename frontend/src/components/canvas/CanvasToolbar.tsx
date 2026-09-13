import {
  ArrowUpRight,
  Circle,
  Eraser,
  Frame,
  Hand,
  ImagePlus,
  Pencil,
  Pointer,
  Spline,
  Square,
  StickyNote,
  Tag,
  Type,
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
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div
        role="toolbar"
        aria-label="Canvas tools"
        className="island pointer-events-auto flex h-12 items-center gap-0.5 px-1.5"
      >
        {TOOL_GROUPS.map((group, groupIndex) => (
          <Fragment key={groupIndex}>
            {groupIndex > 0 ? <Separator orientation="vertical" className="mx-1 h-6" /> : null}
            {group.map((item) => {
              const Icon = item.icon;
              const active = tool === item.tool;
              return (
                <Tooltip key={item.tool}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="tool"
                      aria-label={item.label}
                      aria-pressed={active}
                      className={cn(
                        active &&
                          "bg-accent text-accent-foreground hover:bg-accent-hover hover:text-accent-foreground",
                      )}
                      onClick={() => setTool(item.tool)}
                    >
                      <Icon size={18} strokeWidth={1.75} />
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

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="tool"
              aria-label="Upload image"
              onClick={() => document.getElementById("cistem-image-upload")?.click()}
            >
              <ImagePlus size={18} strokeWidth={1.75} />
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
    </div>
  );
}
