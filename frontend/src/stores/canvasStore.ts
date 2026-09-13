import type { EdgeChange, NodeChange } from "@xyflow/react";
import { create } from "zustand";

import {
  applyEdgeChangesToCanvas,
  collectDescendantIds,
  createCanvasNodeChangeReducer,
  getAbsolutePosition,
  getNodesBounds,
  sortNodesParentsFirst,
} from "@/engine/canvasGraph";
import { COPY_PASTE_OFFSET, GROUP_PADDING, HISTORY_LIMIT } from "@/lib/constants";
import type {
  CanvasComment,
  CanvasDocument,
  CanvasEdge,
  CanvasNode,
  CanvasSnapshot,
  CanvasTool,
  CanvasViewport,
  GroupNode,
  Stroke,
} from "@/types/canvas";

type ClipboardContent = { nodes: CanvasNode[]; edges: CanvasEdge[] } | null;

type SelectionlessState = Pick<
  CanvasStoreState,
  "nodes" | "edges" | "strokes" | "comments" | "past" | "future" | "pendingSnapshot"
>;

export type CanvasStoreState = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  strokes: Stroke[];
  comments: CanvasComment[];
  viewport: CanvasViewport;
  tool: CanvasTool;
  editingNodeId: string | null;
  clipboard: ClipboardContent;
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
  pendingSnapshot: CanvasSnapshot | null;

  setTool: (tool: CanvasTool) => void;
  setViewport: (viewport: CanvasViewport) => void;
  setEditingNode: (nodeId: string | null) => void;

  beginHistory: () => void;
  commitHistory: () => void;
  cancelHistory: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addNode: (node: CanvasNode) => void;
  addNodeForEditing: (node: CanvasNode) => void;
  addNodes: (nodes: CanvasNode[], edges?: CanvasEdge[]) => void;
  updateNode: (id: string, updater: (node: CanvasNode) => CanvasNode) => void;
  removeNodes: (ids: string[], options?: { recordHistory?: boolean }) => void;
  applyNodeChanges: (changes: NodeChange<CanvasNode>[]) => void;

  addEdge: (edge: CanvasEdge) => void;
  updateEdge: (id: string, updater: (edge: CanvasEdge) => CanvasEdge) => void;
  removeEdges: (ids: string[]) => void;
  applyEdgeChanges: (changes: EdgeChange<CanvasEdge>[]) => void;

  addStroke: (stroke: Stroke) => void;
  removeStrokes: (ids: string[]) => void;

  addComment: (comment: CanvasComment) => void;
  removeComment: (id: string) => void;

  selectAll: () => void;
  selectOnly: (id: string) => void;
  clearSelection: () => void;
  removeSelection: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  duplicateSelection: () => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;

  loadDocument: (document: CanvasDocument) => void;
};

function snapshotOf(state: SelectionlessState): CanvasSnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    strokes: state.strokes,
    comments: state.comments,
  };
}

export function selectSelectedNodeIds(state: CanvasStoreState): string[] {
  return state.nodes.filter((node) => node.selected).map((node) => node.id);
}

export function selectSelectedEdgeIds(state: CanvasStoreState): string[] {
  return state.edges.filter((edge) => edge.selected).map((edge) => edge.id);
}

function deselectOthers(nodes: CanvasNode[], keepIds: Set<string>): CanvasNode[] {
  return nodes.map((node) =>
    node.selected && !keepIds.has(node.id) ? { ...node, selected: false } : node,
  );
}

function cloneForPaste(
  liveNodes: CanvasNode[],
  clipboard: NonNullable<ClipboardContent>,
  offset: number,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const liveById = new Map(liveNodes.map((node) => [node.id, node]));
  const idMap = new Map<string, string>();
  for (const node of clipboard.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }

  const nodes = clipboard.nodes.map((node): CanvasNode => {
    const newId = idMap.get(node.id) ?? crypto.randomUUID();
    const copiedParentId = node.parentId ? idMap.get(node.parentId) : undefined;
    const position =
      node.parentId && !copiedParentId
        ? (() => {
            const absolute = getAbsolutePosition(node, liveById);
            return { x: absolute.x + offset, y: absolute.y + offset };
          })()
        : node.parentId
          ? { ...node.position }
          : { x: node.position.x + offset, y: node.position.y + offset };

    return {
      ...node,
      id: newId,
      parentId: copiedParentId,
      position,
      selected: true,
      data: { ...node.data },
    };
  });

  const edges = clipboard.edges
    .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
    .map((edge) => ({
      ...edge,
      id: crypto.randomUUID(),
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
      selected: false,
    }));

  return { nodes, edges };
}

export const useCanvasStore = create<CanvasStoreState>()((set, get) => ({
  nodes: [],
  edges: [],
  strokes: [],
  comments: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  tool: "select",
  editingNodeId: null,
  clipboard: null,
  past: [],
  future: [],
  pendingSnapshot: null,

  setTool: (tool) => {
    set({ tool, editingNodeId: null });
  },

  setViewport: (viewport) => {
    set({ viewport });
  },

  setEditingNode: (editingNodeId) => {
    set({ editingNodeId });
  },

  beginHistory: () => {
    const state = get();
    if (state.pendingSnapshot) return;
    set({ pendingSnapshot: snapshotOf(state) });
  },

  commitHistory: () => {
    const state = get();
    if (!state.pendingSnapshot) return;
    set({
      past: [...state.past, state.pendingSnapshot].slice(-HISTORY_LIMIT),
      future: [],
      pendingSnapshot: null,
    });
  },

  cancelHistory: () => {
    set({ pendingSnapshot: null });
  },

  pushHistory: () => {
    const state = get();
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      pendingSnapshot: null,
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const previous = state.past[state.past.length - 1];
    if (!previous) return;
    const current = snapshotOf(state);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      strokes: previous.strokes,
      comments: previous.comments,
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, HISTORY_LIMIT),
      pendingSnapshot: null,
      editingNodeId: null,
    });
  },

  redo: () => {
    const state = get();
    const next = state.future[0];
    if (!next) return;
    const current = snapshotOf(state);

    set({
      nodes: next.nodes,
      edges: next.edges,
      strokes: next.strokes,
      comments: next.comments,
      past: [...state.past, current].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      pendingSnapshot: null,
      editingNodeId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addNode: (node) => {
    const state = get();
    const nodes = sortNodesParentsFirst([...deselectOthers(state.nodes, new Set([node.id])), node]);
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      pendingSnapshot: null,
      nodes,
    });
  },

  addNodeForEditing: (node) => {
    const state = get();
    if (!state.pendingSnapshot) {
      set({ pendingSnapshot: snapshotOf(state) });
    }
    set({
      nodes: sortNodesParentsFirst([...deselectOthers(state.nodes, new Set([node.id])), node]),
      editingNodeId: node.id,
    });
  },

  addNodes: (nodes, edges = []) => {
    const state = get();
    const keepIds = new Set(nodes.map((node) => node.id));
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      pendingSnapshot: null,
      nodes: sortNodesParentsFirst([...deselectOthers(state.nodes, keepIds), ...nodes]),
      edges: [...state.edges, ...edges],
    });
  },

  updateNode: (id, updater) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? updater(node) : node)),
    }));
  },

  removeNodes: (ids, options) => {
    const state = get();
    const removeIds = collectDescendantIds(state.nodes, ids);
    if (removeIds.size === 0) return;
    if (options?.recordHistory !== false) {
      set({ past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT), future: [] });
    }
    set((current) => ({
      nodes: current.nodes.filter((node) => !removeIds.has(node.id)),
      edges: current.edges.filter(
        (edge) => !removeIds.has(edge.source) && !removeIds.has(edge.target),
      ),
      comments: current.comments.filter((comment) => !removeIds.has(comment.targetId)),
      editingNodeId:
        current.editingNodeId && removeIds.has(current.editingNodeId)
          ? null
          : current.editingNodeId,
    }));
  },

  applyNodeChanges: (changes) => {
    set((state) => {
      const nodes = createCanvasNodeChangeReducer(state.nodes, changes);
      if (nodes === state.nodes) return state;
      const liveIds = new Set(nodes.map((node) => node.id));
      const edges = state.edges.filter(
        (edge) => liveIds.has(edge.source) && liveIds.has(edge.target),
      );
      return { nodes, edges };
    });
  },

  addEdge: (edge) => {
    const state = get();
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      edges: [...state.edges, edge],
    });
  },

  updateEdge: (id, updater) => {
    set((state) => ({
      edges: state.edges.map((edge) => (edge.id === id ? updater(edge) : edge)),
    }));
  },

  removeEdges: (ids) => {
    if (ids.length === 0) return;
    const state = get();
    const removeIds = new Set(ids);
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      edges: state.edges.filter((edge) => !removeIds.has(edge.id)),
    });
  },

  applyEdgeChanges: (changes) => {
    set((state) => ({ edges: applyEdgeChangesToCanvas(state.edges, changes) }));
  },

  addStroke: (stroke) => {
    set((state) => ({ strokes: [...state.strokes, stroke] }));
  },

  removeStrokes: (ids) => {
    if (ids.length === 0) return;
    const removeIds = new Set(ids);
    set((state) => ({ strokes: state.strokes.filter((stroke) => !removeIds.has(stroke.id)) }));
  },

  addComment: (comment) => {
    const state = get();
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      comments: [...state.comments, comment],
    });
  },

  removeComment: (id) => {
    const state = get();
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      comments: state.comments.filter((comment) => comment.id !== id),
    });
  },

  selectAll: () => {
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, selected: true })),
      edges: state.edges.map((edge) => ({ ...edge, selected: true })),
    }));
  },

  selectOnly: (id) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.selected === (node.id === id) ? node : { ...node, selected: node.id === id },
      ),
      edges: state.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
    }));
  },

  clearSelection: () => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
      edges: state.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
    }));
  },

  removeSelection: () => {
    const state = get();
    const nodeIds = state.nodes.filter((node) => node.selected).map((node) => node.id);
    const edgeIds = state.edges.filter((edge) => edge.selected).map((edge) => edge.id);
    if (nodeIds.length === 0 && edgeIds.length === 0) return;

    const removeNodeIds = collectDescendantIds(state.nodes, nodeIds);
    const removeEdgeIds = new Set(edgeIds);
    const nodes = state.nodes.filter((node) => !removeNodeIds.has(node.id));
    const edges = state.edges.filter(
      (edge) =>
        !removeEdgeIds.has(edge.id) &&
        !removeNodeIds.has(edge.source) &&
        !removeNodeIds.has(edge.target),
    );

    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes,
      edges,
      comments: state.comments.filter((comment) => !removeNodeIds.has(comment.targetId)),
      editingNodeId:
        state.editingNodeId && removeNodeIds.has(state.editingNodeId) ? null : state.editingNodeId,
    });
  },

  copySelection: () => {
    const state = get();
    const nodes = state.nodes.filter((node) => node.selected);
    if (nodes.length === 0) {
      set({ clipboard: null });
      return;
    }
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = state.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
    set({ clipboard: { nodes, edges } });
  },

  pasteClipboard: () => {
    const state = get();
    if (!state.clipboard || state.clipboard.nodes.length === 0) return;
    const { nodes, edges } = cloneForPaste(state.nodes, state.clipboard, COPY_PASTE_OFFSET);
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes: sortNodesParentsFirst([...deselectOthers(state.nodes, new Set()), ...nodes]),
      edges: [...state.edges, ...edges],
    });
  },

  duplicateSelection: () => {
    const state = get();
    const sourceNodes = state.nodes.filter((node) => node.selected);
    if (sourceNodes.length === 0) return;
    const nodeIds = new Set(sourceNodes.map((node) => node.id));
    const sourceEdges = state.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
    const { nodes, edges } = cloneForPaste(
      state.nodes,
      { nodes: sourceNodes, edges: sourceEdges },
      COPY_PASTE_OFFSET,
    );
    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes: sortNodesParentsFirst([...deselectOthers(state.nodes, new Set()), ...nodes]),
      edges: [...state.edges, ...edges],
    });
  },

  groupSelection: () => {
    const state = get();
    const selected = state.nodes.filter((node) => node.selected && !node.parentId);
    if (selected.length < 2) return;
    const bounds = getNodesBounds(selected);
    if (!bounds) return;

    const byId = new Map(state.nodes.map((node) => [node.id, node]));
    const groupId = crypto.randomUUID();
    const group: GroupNode = {
      id: groupId,
      type: "group",
      position: { x: bounds.x - GROUP_PADDING, y: bounds.y - GROUP_PADDING },
      width: bounds.width + GROUP_PADDING * 2,
      height: bounds.height + GROUP_PADDING * 2,
      data: {},
      selected: false,
    };
    const childIds = new Set(selected.map((node) => node.id));

    const nodes = state.nodes.map((node): CanvasNode => {
      if (!childIds.has(node.id)) {
        return node.selected ? { ...node, selected: false } : node;
      }
      const absolute = getAbsolutePosition(node, byId);
      return {
        ...node,
        parentId: groupId,
        position: {
          x: absolute.x - group.position.x,
          y: absolute.y - group.position.y,
        },
        selected: false,
      };
    });

    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes: sortNodesParentsFirst([...nodes, group]),
    });
  },

  ungroupSelection: () => {
    const state = get();
    const groups = state.nodes.filter((node) => node.selected && node.type === "group");
    if (groups.length === 0) return;
    const groupIds = new Set(groups.map((group) => group.id));
    const byId = new Map(state.nodes.map((node) => [node.id, node]));

    const nodes: CanvasNode[] = [];
    for (const node of state.nodes) {
      if (groupIds.has(node.id)) continue;
      if (node.parentId && groupIds.has(node.parentId)) {
        const absolute = getAbsolutePosition(node, byId);
        nodes.push({ ...node, parentId: undefined, position: absolute, selected: true });
      } else {
        nodes.push(node);
      }
    }

    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes: sortNodesParentsFirst(nodes),
    });
  },

  nudgeSelection: (dx, dy) => {
    const state = get();
    const selectedIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    if (selectedIds.size === 0) return;

    const byId = new Map(state.nodes.map((node) => [node.id, node]));
    const hasSelectedAncestor = (node: CanvasNode): boolean => {
      let parentId = node.parentId;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        if (selectedIds.has(parentId)) return true;
        seen.add(parentId);
        parentId = byId.get(parentId)?.parentId;
      }
      return false;
    };

    set({
      past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      nodes: state.nodes.map((node) =>
        node.selected && !hasSelectedAncestor(node)
          ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } }
          : node,
      ),
    });
  },

  loadDocument: (document) => {
    set({
      nodes: sortNodesParentsFirst(document.nodes),
      edges: document.edges,
      strokes: document.strokes,
      comments: document.comments,
      viewport: document.viewport,
      past: [],
      future: [],
      pendingSnapshot: null,
      clipboard: null,
      editingNodeId: null,
    });
  },
}));
