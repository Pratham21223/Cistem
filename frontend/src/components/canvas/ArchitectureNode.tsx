import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo, useState } from "react";

import { NodeHandles } from "@/components/canvas/NodeHandles";
import { RoughSvg } from "@/components/canvas/RoughSvg";
import { roughRoundedRectanglePaths } from "@/engine/rough";
import {
  CATEGORY_FILL_CLASS,
  CATEGORY_LABELS,
  PROVENANCE_DOT_CLASS,
  PROVENANCE_LABEL,
} from "@/lib/canvasVisuals";
import { ROUGH_STROKE_WIDTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { SemanticNode } from "@/types/canvas";

export const ArchitectureNode = memo(function ArchitectureNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  if (!node || node.type !== "semantic") return null;
  return <SemanticNodeBody node={node} selected={Boolean(selected)} />;
});

function SemanticNodeBody({ node, selected }: { node: SemanticNode; selected: boolean }) {
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const cancelHistory = useCanvasStore((state) => state.cancelHistory);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const [draftLabel, setDraftLabel] = useState<string | null>(null);

  const paths = useMemo(
    () =>
      roughRoundedRectanglePaths(node.width, node.height, 16, {
        seed: node.id,
        strokeWidth: ROUGH_STROKE_WIDTH,
      }),
    [node.width, node.height, node.id],
  );

  const startRename = (): void => {
    beginHistory();
    setDraftLabel(node.label);
  };

  const finishRename = (value: string, original: string): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === original) {
      cancelHistory();
    } else {
      updateNode(node.id, (candidate) =>
        candidate.type === "semantic" ? { ...candidate, label: trimmed } : candidate,
      );
      commitHistory();
    }
    setDraftLabel(null);
  };

  return (
    <div
      className="group relative h-full w-full"
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (draftLabel === null) startRename();
      }}
    >
      {selected ? (
        <div className="pointer-events-none absolute -inset-1.5 rounded-2xl border-2 border-dashed border-accent" />
      ) : null}

      <div className={cn("absolute inset-0 rounded-2xl", CATEGORY_FILL_CLASS[node.category])} />
      <RoughSvg width={node.width} height={node.height} paths={paths} className="stroke-stroke" />

      {selected ? (
        <NodeResizer
          minWidth={120}
          minHeight={48}
          isVisible
          onResizeStart={beginHistory}
          onResizeEnd={commitHistory}
          lineClassName="!border-accent !border-dashed"
          handleClassName="!h-2.5 !w-2.5 !rounded-xs !border !border-accent !bg-surface"
        />
      ) : null}

      <div className="relative z-10 flex h-full min-w-0 flex-col justify-center gap-0.5 px-4">
        {draftLabel !== null ? (
          <input
            className="nodrag w-full rounded-xs border border-accent bg-surface px-1 font-hand text-[18px] font-semibold text-text-primary outline-none"
            value={draftLabel}
            autoFocus
            aria-label="Component name"
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={(event) => finishRename(event.target.value, node.label)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftLabel(null);
                cancelHistory();
              }
            }}
          />
        ) : (
          <span
            className="truncate font-hand text-[19px] font-semibold leading-tight text-ink"
            title={node.label}
          >
            {node.label}
          </span>
        )}
        <span className="truncate font-hand text-[16px] leading-tight text-ink-muted">
          {CATEGORY_LABELS[node.category]}
        </span>
      </div>

      <span
        className={cn(
          "absolute right-2.5 top-2.5 h-2 w-2 rounded-full",
          PROVENANCE_DOT_CLASS[node.provenance],
        )}
        title={`${PROVENANCE_LABEL[node.provenance]}${
          node.confidence !== null ? ` · confidence ${node.confidence}` : ""
        }`}
        aria-label={`Provenance: ${PROVENANCE_LABEL[node.provenance]}`}
      />

      <NodeHandles />
    </div>
  );
}
