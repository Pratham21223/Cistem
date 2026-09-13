import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  type Connection,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";

import { FreehandLayer } from "@/components/canvas/FreehandLayer";
import { EDGE_TYPES, NODE_TYPES } from "@/components/canvas/canvasTypes";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { useImagePaste } from "@/hooks/useImagePaste";
import { GRID_SIZE, ZOOM_MAX, ZOOM_MIN } from "@/lib/constants";
import { useCanvasStore } from "@/stores/canvasStore";

type ArchitectureCanvasProps = {
  onNodeContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onPaneClick?: () => void;
};

export function ArchitectureCanvas({
  onNodeContextMenu,
  onPaneContextMenu,
  onPaneClick,
}: ArchitectureCanvasProps) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const viewport = useCanvasStore((state) => state.viewport);
  const tool = useCanvasStore((state) => state.tool);
  const applyNodeChanges = useCanvasStore((state) => state.applyNodeChanges);
  const applyEdgeChanges = useCanvasStore((state) => state.applyEdgeChanges);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const selectOnly = useCanvasStore((state) => state.selectOnly);

  useCanvasShortcuts();
  useImagePaste();

  // React Flow needs children to declare parent containment; the canvas model stores
  // parentId (architecture.md §2.4) and this mapping adds the RF-specific `extent`.
  const reactFlowNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        extent: node.parentId ? ("parent" as const) : undefined,
      })),
    [nodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      addEdge({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: tool === "connector" ? "data_flow" : "request_flow",
      });
    },
    [addEdge, tool],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      selectOnly(node.id);
      onNodeContextMenu?.(event, node.id);
    },
    [onNodeContextMenu, selectOnly],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      onPaneContextMenu?.(event as React.MouseEvent);
    },
    [onPaneContextMenu],
  );

  return (
    <ReactFlow
      nodes={reactFlowNodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={applyNodeChanges}
      onEdgesChange={applyEdgeChanges}
      onConnect={handleConnect}
      onNodeDragStart={beginHistory}
      onNodeDragStop={commitHistory}
      onMoveEnd={(_event, nextViewport) => setViewport(nextViewport)}
      defaultViewport={viewport}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      connectionMode={ConnectionMode.Loose}
      panOnDrag={tool === "hand" ? true : [1]}
      panOnScroll
      zoomOnScroll={false}
      zoomActivationKeyCode={["Control", "Meta"]}
      selectionOnDrag={tool === "select"}
      multiSelectionKeyCode={["Shift", "Meta", "Control"]}
      nodesDraggable={tool === "select"}
      nodesConnectable={tool === "select" || tool === "arrow" || tool === "connector"}
      elementsSelectable={tool === "select" || tool === "arrow" || tool === "connector"}
      deleteKeyCode={null}
      onlyRenderVisibleElements
      onNodeContextMenu={handleNodeContextMenu}
      onPaneContextMenu={handlePaneContextMenu}
      onPaneClick={onPaneClick}
      className="bg-canvas"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={GRID_SIZE}
        size={1}
        color="var(--color-canvas-grid-dot)"
      />
      <FreehandLayer />
    </ReactFlow>
  );
}
