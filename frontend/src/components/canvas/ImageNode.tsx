import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import { NodeHandles } from "@/components/canvas/NodeHandles";
import { RoughSvg } from "@/components/canvas/RoughSvg";
import { roughRoundedRectanglePaths } from "@/engine/rough";
import { ROUGH_STROKE_WIDTH } from "@/lib/constants";
import { getImageUrl } from "@/services/imageRegistry";
import { useCanvasStore } from "@/stores/canvasStore";

export const ImageNode = memo(function ImageNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);

  const paths = useMemo(
    () =>
      node?.type === "image"
        ? roughRoundedRectanglePaths(node.width, node.height, 8, {
            seed: node.id,
            strokeWidth: ROUGH_STROKE_WIDTH,
          })
        : [],
    [node?.id, node?.type, node?.width, node?.height],
  );

  if (!node || node.type !== "image") return null;

  const imageUrl = getImageUrl(node.imageId);

  return (
    <div className="group relative h-full w-full">
      {selected ? (
        <div className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-dashed border-accent" />
      ) : null}
      <div className="absolute inset-0 overflow-hidden rounded-lg bg-node-surface shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={node.alt}
            className="h-full w-full select-none object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-hand text-[16px] text-text-muted">
            Image unavailable
          </div>
        )}
      </div>
      <RoughSvg width={node.width} height={node.height} paths={paths} className="stroke-stroke" />
      {selected ? (
        <NodeResizer
          minWidth={80}
          minHeight={60}
          isVisible
          onResizeStart={beginHistory}
          onResizeEnd={commitHistory}
          lineClassName="!border-accent !border-dashed"
          handleClassName="!h-2.5 !w-2.5 !rounded-xs !border !border-accent !bg-surface"
        />
      ) : null}
      <NodeHandles />
    </div>
  );
});
