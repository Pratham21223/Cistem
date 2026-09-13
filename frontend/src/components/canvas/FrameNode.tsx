import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo, useState } from "react";

import { RoughSvg } from "@/components/canvas/RoughSvg";
import { SelectionOutline } from "@/components/canvas/SelectionOutline";
import { roughRoundedRectanglePaths } from "@/engine/rough";
import { RESIZE_HANDLE_CLASSNAME, RESIZE_LINE_CLASSNAME } from "@/lib/canvasVisuals";
import { ROUGH_STROKE_WIDTH } from "@/lib/constants";
import { useCanvasStore } from "@/stores/canvasStore";

export const FrameNode = memo(function FrameNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const cancelHistory = useCanvasStore((state) => state.cancelHistory);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const [draftLabel, setDraftLabel] = useState<string | null>(null);

  const paths = useMemo(
    () =>
      node?.type === "frame"
        ? roughRoundedRectanglePaths(node.width, node.height, 8, {
            seed: node.id,
            strokeWidth: ROUGH_STROKE_WIDTH,
          })
        : [],
    [node?.id, node?.type, node?.width, node?.height],
  );

  if (!node || node.type !== "frame") return null;

  const finishRename = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed !== node.label) {
      updateNode(id, (candidate) =>
        candidate.type === "frame" ? { ...candidate, label: trimmed } : candidate,
      );
      commitHistory();
    } else {
      cancelHistory();
    }
    setDraftLabel(null);
  };

  return (
    <div className="group relative h-full w-full">
      <SelectionOutline selected={selected} />
      <div className="absolute inset-0 rounded-lg bg-surface/40" />
      <RoughSvg
        width={node.width}
        height={node.height}
        paths={paths}
        className={selected ? "stroke-accent" : "stroke-border-strong"}
      />
      {selected ? (
        <NodeResizer
          minWidth={160}
          minHeight={120}
          isVisible
          onResizeStart={beginHistory}
          onResizeEnd={commitHistory}
          lineClassName={RESIZE_LINE_CLASSNAME}
          handleClassName={RESIZE_HANDLE_CLASSNAME}
        />
      ) : null}
      {draftLabel !== null ? (
        <input
          className="nodrag focus-ring absolute -top-7 left-1 h-6 rounded-xs border border-accent bg-surface px-1.5 text-diagram-sm font-medium text-text-primary"
          value={draftLabel}
          autoFocus
          aria-label="Frame name"
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={(event) => finishRename(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraftLabel(null);
              cancelHistory();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="nodrag focus-ring absolute -top-7 left-1 h-6 rounded-sm px-1 text-diagram-sm font-medium text-text-secondary transition-colors duration-fast hover:text-text-primary"
          onDoubleClick={(event) => {
            event.stopPropagation();
            beginHistory();
            setDraftLabel(node.label);
          }}
        >
          {node.label}
        </button>
      )}
    </div>
  );
});
