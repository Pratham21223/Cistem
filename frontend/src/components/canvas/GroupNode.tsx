import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import { RoughSvg } from "@/components/canvas/RoughSvg";
import { SelectionOutline } from "@/components/canvas/SelectionOutline";
import { roughRoundedRectanglePaths } from "@/engine/rough";
import { RESIZE_HANDLE_CLASSNAME, RESIZE_LINE_CLASSNAME } from "@/lib/canvasVisuals";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";

export const GroupNode = memo(function GroupNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);

  const paths = useMemo(
    () =>
      node?.type === "group"
        ? roughRoundedRectanglePaths(node.width, node.height, 16, {
            seed: node.id,
            strokeWidth: 1.3,
            strokeLineDash: [8, 7],
          })
        : [],
    [node?.id, node?.type, node?.width, node?.height],
  );

  if (!node || node.type !== "group") return null;

  return (
    <div className="group relative h-full w-full">
      <SelectionOutline selected={selected} />
      <div
        className={cn(
          "absolute inset-0 rounded-xl",
          selected ? "bg-accent-muted" : "bg-surface-secondary/40",
        )}
      />
      <RoughSvg
        width={node.width}
        height={node.height}
        paths={paths}
        className={selected ? "stroke-accent" : "stroke-text-faint"}
        strokeDasharray="8 7"
      />
      {selected ? (
        <NodeResizer
          minWidth={120}
          minHeight={100}
          isVisible
          onResizeStart={beginHistory}
          onResizeEnd={commitHistory}
          lineClassName={RESIZE_LINE_CLASSNAME}
          handleClassName={RESIZE_HANDLE_CLASSNAME}
        />
      ) : null}
      <span className="pointer-events-none absolute -top-5 left-1 text-diagram-sm text-text-faint">
        group
      </span>
    </div>
  );
});
