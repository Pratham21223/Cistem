import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import { NodeHandles } from "@/components/canvas/NodeHandles";
import { RoughSvg } from "@/components/canvas/RoughSvg";
import { roughEllipsePaths, roughRoundedRectanglePaths } from "@/engine/rough";
import { ROUGH_STROKE_WIDTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { NoteNode, ShapeNode, TextNode } from "@/types/canvas";

type FreeformNode = TextNode | ShapeNode | NoteNode;

export const CustomNode = memo(function CustomNode({ id, selected }: NodeProps) {
  const node = useCanvasStore((state) => state.nodes.find((candidate) => candidate.id === id));
  if (!node || (node.type !== "text" && node.type !== "shape" && node.type !== "note")) {
    return null;
  }
  return <CustomNodeBody node={node} selected={Boolean(selected)} />;
});

function CustomNodeBody({ node, selected }: { node: FreeformNode; selected: boolean }) {
  const editingNodeId = useCanvasStore((state) => state.editingNodeId);
  const setEditingNode = useCanvasStore((state) => state.setEditingNode);
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const cancelHistory = useCanvasStore((state) => state.cancelHistory);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const removeNodes = useCanvasStore((state) => state.removeNodes);

  const shapeKind = node.type === "shape" ? node.shape : null;

  const paths = useMemo(() => {
    if (shapeKind === "ellipse") {
      return roughEllipsePaths(node.width, node.height, {
        seed: node.id,
        strokeWidth: ROUGH_STROKE_WIDTH,
      });
    }
    if (shapeKind === "rectangle") {
      return roughRoundedRectanglePaths(node.width, node.height, 12, {
        seed: node.id,
        strokeWidth: ROUGH_STROKE_WIDTH,
      });
    }
    if (node.type === "note") {
      return roughRoundedRectanglePaths(node.width, node.height, 6, {
        seed: node.id,
        strokeWidth: ROUGH_STROKE_WIDTH,
      });
    }
    return [];
  }, [node.id, node.type, node.width, node.height, shapeKind]);

  const isEditing = editingNodeId === node.id;
  const textContent = node.type === "text" || node.type === "note" ? node.text : "";

  const startEditing = (): void => {
    if (node.type === "shape") return;
    beginHistory();
    setEditingNode(node.id);
  };

  const finishEditing = (value: string): void => {
    const current = useCanvasStore.getState().nodes.find((candidate) => candidate.id === node.id);
    const original =
      current && (current.type === "text" || current.type === "note") ? current.text : "";

    if (value.trim().length === 0 && node.type !== "shape") {
      removeNodes([node.id], { recordHistory: false });
      cancelHistory();
      setEditingNode(null);
      return;
    }
    if (value === original) {
      cancelHistory();
      setEditingNode(null);
      return;
    }
    updateNode(node.id, (candidate) => {
      if (candidate.type === "text" || candidate.type === "note") {
        return { ...candidate, text: value };
      }
      return candidate;
    });
    commitHistory();
    setEditingNode(null);
  };

  const editingProps = {
    className:
      "nodrag nowheel h-full w-full resize-none bg-transparent p-0 font-hand text-[18px] leading-snug text-text-primary placeholder:text-text-faint focus:outline-none",
    autoFocus: true,
    "aria-label": "Edit text",
    onBlur: (event: React.FocusEvent<HTMLTextAreaElement>) => finishEditing(event.target.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelHistory();
        setEditingNode(null);
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.currentTarget.blur();
      }
    },
  };

  const selectionOutline = selected ? (
    <div
      className={cn(
        "pointer-events-none absolute -inset-1.5 border-2 border-dashed border-accent",
        node.type === "shape" && node.shape === "ellipse" ? "rounded-full" : "rounded-xl",
      )}
    />
  ) : null;

  if (node.type === "shape") {
    return (
      <div
        className="group relative h-full w-full"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {selectionOutline}
        <div
          className={cn(
            "absolute inset-0 bg-pastel-blue",
            node.shape === "ellipse" ? "rounded-full" : "rounded-xl",
          )}
        />
        <RoughSvg width={node.width} height={node.height} paths={paths} className="stroke-stroke" />
        {selected ? (
          <NodeResizer
            minWidth={40}
            minHeight={30}
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
  }

  if (node.type === "note") {
    return (
      <div
        className="group relative h-full w-full"
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!isEditing) startEditing();
        }}
      >
        {selectionOutline}
        <div className="absolute inset-0 rounded-md bg-pastel-yellow shadow-xs" />
        <RoughSvg width={node.width} height={node.height} paths={paths} className="stroke-stroke" />
        {selected ? (
          <NodeResizer
            minWidth={100}
            minHeight={80}
            isVisible
            onResizeStart={beginHistory}
            onResizeEnd={commitHistory}
            lineClassName="!border-accent !border-dashed"
            handleClassName="!h-2.5 !w-2.5 !rounded-xs !border !border-accent !bg-surface"
          />
        ) : null}
        <div className="relative z-10 h-full w-full p-3">
          {isEditing ? (
            <textarea defaultValue={textContent} {...editingProps} />
          ) : (
            <p className="whitespace-pre-wrap font-hand text-[18px] leading-snug text-ink">
              {textContent || <span className="text-ink-muted">Double-click to write</span>}
            </p>
          )}
        </div>
        <NodeHandles />
      </div>
    );
  }

  // text / label
  const isLabel = node.variant === "label";
  return (
    <div
      className={cn("group relative h-full w-full", isLabel ? "flex items-center" : "px-1 py-0.5")}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!isEditing) startEditing();
      }}
    >
      {selectionOutline}
      <div className="relative z-10 h-full w-full">
        {isEditing ? (
          <textarea defaultValue={textContent} {...editingProps} />
        ) : (
          <p
            className={cn(
              "whitespace-pre-wrap font-hand leading-snug",
              isLabel
                ? "text-[16px] font-medium text-text-secondary"
                : "text-[19px] text-text-primary",
            )}
          >
            {textContent || (
              <span className="text-text-faint">{isLabel ? "Label" : "Double-click to edit"}</span>
            )}
          </p>
        )}
      </div>
      <NodeHandles />
    </div>
  );
}
