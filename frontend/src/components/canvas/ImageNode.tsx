import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import { NodeHandles } from "@/components/canvas/NodeHandles";
import { RoughSvg } from "@/components/canvas/RoughSvg";
import { SelectionOutline } from "@/components/canvas/SelectionOutline";
import { roughRoundedRectanglePaths } from "@/engine/rough";
import { useImageUrl } from "@/hooks/useImageUrl";
import { RESIZE_HANDLE_CLASSNAME, RESIZE_LINE_CLASSNAME } from "@/lib/canvasVisuals";
import { ROUGH_STROKE_WIDTH } from "@/lib/constants";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ImageNode as ImageNodeModel } from "@/types/canvas";

export const ImageNode = memo(function ImageNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  if (!node || node.type !== "image") return null;
  return <ImageNodeBody node={node} selected={Boolean(selected)} />;
});

function ImageNodeBody({ node, selected }: { node: ImageNodeModel; selected: boolean }) {
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const imageUrl = useImageUrl(node.imageId);

  const paths = useMemo(
    () =>
      roughRoundedRectanglePaths(node.width, node.height, 8, {
        seed: node.id,
        strokeWidth: ROUGH_STROKE_WIDTH,
      }),
    [node.width, node.height, node.id],
  );

  return (
    <div className="group relative h-full w-full">
      <SelectionOutline selected={selected} />
      <div className="absolute inset-0 overflow-hidden rounded-lg bg-node-surface shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={node.alt}
            className="h-full w-full select-none object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-diagram-sm text-text-muted">
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
          lineClassName={RESIZE_LINE_CLASSNAME}
          handleClassName={RESIZE_HANDLE_CLASSNAME}
        />
      ) : null}
      <NodeHandles visible={selected} />
    </div>
  );
}
