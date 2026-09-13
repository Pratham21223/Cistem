import { beforeEach, describe, expect, it } from "vitest";

import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasEdge, CanvasNode, GroupNode, SemanticNode, TextNode } from "@/types/canvas";

function semantic(id: string, x = 0, y = 0, parentId?: string): SemanticNode {
  return {
    id,
    type: "semantic",
    position: { x, y },
    width: 160,
    height: 64,
    parentId,
    data: {},
    label: id,
    componentType: "api_server",
    category: "compute",
    provenance: "user_selected",
    confidence: null,
  };
}

function text(id: string, value: string): TextNode {
  return {
    id,
    type: "text",
    position: { x: 0, y: 0 },
    width: 100,
    height: 30,
    data: {},
    text: value,
    variant: "text",
  };
}

function group(id: string): GroupNode {
  return {
    id,
    type: "group",
    position: { x: 0, y: 0 },
    width: 400,
    height: 300,
    data: {},
  };
}

function edge(id: string, source: string, target: string): CanvasEdge {
  return { id, source, target, type: "request_flow" };
}

function resetStore(): void {
  useCanvasStore.getState().loadDocument({
    schemaVersion: 1,
    nodes: [],
    edges: [],
    strokes: [],
    comments: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  useCanvasStore.getState().setTool("select");
}

function selectNode(...ids: string[]): void {
  useCanvasStore.getState().applyNodeChanges(
    useCanvasStore.getState().nodes.map((node) => ({
      id: node.id,
      type: "select" as const,
      selected: ids.includes(node.id),
    })),
  );
}

describe("canvasStore history", () => {
  beforeEach(resetStore);

  it("undoes and redoes node creation", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a"));
    expect(useCanvasStore.getState().nodes).toHaveLength(1);

    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(0);

    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });

  it("tracks freehand strokes in a single history entry per session", () => {
    const store = useCanvasStore.getState();
    store.beginHistory();
    store.addStroke({
      id: "s1",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      width: 2,
      color: "stroke",
    });
    store.addStroke({
      id: "s2",
      points: [
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      width: 2,
      color: "stroke",
    });
    store.commitHistory();

    expect(useCanvasStore.getState().strokes).toHaveLength(2);
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().strokes).toHaveLength(0);
  });

  it("keeps text edits and node creation in one undoable session", () => {
    const store = useCanvasStore.getState();
    store.addNodeForEditing(text("t1", ""));
    useCanvasStore
      .getState()
      .updateNode("t1", (node) => (node.type === "text" ? { ...node, text: "1M users" } : node));
    useCanvasStore.getState().commitHistory();

    expect(useCanvasStore.getState().nodes).toHaveLength(1);
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
  });
});

describe("canvasStore mutations", () => {
  beforeEach(resetStore);

  it("removes descendants, connected edges, and comments with one history entry", () => {
    const store = useCanvasStore.getState();
    store.loadDocument({
      schemaVersion: 1,
      nodes: [group("g"), semantic("child", 10, 10, "g"), semantic("outsider", 500, 500)],
      edges: [edge("e1", "child", "outsider"), edge("e2", "outsider", "child")],
      strokes: [],
      comments: [
        {
          id: "c1",
          targetId: "child",
          author: "You",
          text: "Check this",
          createdAt: "2026-09-13T10:00:00.000Z",
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    useCanvasStore.getState().removeNodes(["g"]);

    const state = useCanvasStore.getState();
    expect(state.nodes.map((node) => node.id)).toEqual(["outsider"]);
    expect(state.edges).toHaveLength(0);
    expect(state.comments).toHaveLength(0);

    state.undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(3);
  });

  it("groups selected nodes and positions children relative to the group", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a", 0, 0));
    store.addNode(semantic("b", 200, 100));
    selectNode("a", "b");

    useCanvasStore.getState().groupSelection();

    const state = useCanvasStore.getState();
    const groupNode = state.nodes.find((node) => node.type === "group");
    const childA = state.nodes.find((node) => node.id === "a");
    const childB = state.nodes.find((node) => node.id === "b");

    expect(groupNode).toBeDefined();
    expect(childA?.parentId).toBe(groupNode?.id);
    expect(childB?.parentId).toBe(groupNode?.id);
    expect(childA?.position).toEqual({ x: 24, y: 24 });
    expect(childB?.position).toEqual({ x: 224, y: 124 });
    expect(state.nodes[0]?.id).toBe(groupNode?.id);
  });

  it("ungroups and restores absolute positions", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a", 0, 0));
    store.addNode(semantic("b", 200, 100));
    selectNode("a", "b");
    useCanvasStore.getState().groupSelection();

    const groupId = useCanvasStore.getState().nodes.find((node) => node.type === "group")?.id;
    selectNode(groupId ?? "");
    useCanvasStore.getState().ungroupSelection();

    const state = useCanvasStore.getState();
    expect(state.nodes.some((node) => node.type === "group")).toBe(false);
    expect(state.nodes.find((node) => node.id === "a")?.position).toEqual({ x: 0, y: 0 });
    expect(state.nodes.find((node) => node.id === "b")?.position).toEqual({ x: 200, y: 100 });
  });

  it("copies and pastes with an offset and fresh ids", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a", 0, 0));
    store.addNode(semantic("b", 200, 0));
    selectNode("a", "b");
    store.addEdge(edge("e1", "a", "b"));
    useCanvasStore.getState().copySelection();
    useCanvasStore.getState().pasteClipboard();

    const state = useCanvasStore.getState();
    expect(state.nodes).toHaveLength(4);
    expect(state.edges).toHaveLength(2);

    const pasted = state.nodes.filter((node) => node.selected);
    expect(pasted).toHaveLength(2);
    expect(pasted.every((node) => node.position.x >= 16)).toBe(true);
  });

  it("duplicates a selection with one history entry", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a", 0, 0));
    selectNode("a");

    useCanvasStore.getState().duplicateSelection();
    expect(useCanvasStore.getState().nodes).toHaveLength(2);

    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });

  it("prunes edges when a connected node is removed through React Flow changes", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a"));
    store.addNode(semantic("b"));
    store.addEdge(edge("e1", "a", "b"));

    useCanvasStore.getState().applyNodeChanges([{ id: "a", type: "remove" }]);

    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });

  it("nudges roots but not children whose parent is also selected", () => {
    const store = useCanvasStore.getState();
    store.addNode(group("g"));
    store.addNode(semantic("child", 10, 10, "g"));
    selectNode("g", "child");

    useCanvasStore.getState().nudgeSelection(10, 5);

    const state = useCanvasStore.getState();
    expect(state.nodes.find((node) => node.id === "g")?.position).toEqual({ x: 10, y: 5 });
    expect(state.nodes.find((node) => node.id === "child")?.position).toEqual({ x: 10, y: 10 });
  });

  it("loads a document and clears history", () => {
    const store = useCanvasStore.getState();
    store.addNode(semantic("a"));
    const document = {
      schemaVersion: 1 as const,
      nodes: [semantic("x")] as CanvasNode[],
      edges: [],
      strokes: [],
      comments: [],
      viewport: { x: 100, y: 50, zoom: 2 },
    };

    useCanvasStore.getState().loadDocument(document);

    const state = useCanvasStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.viewport).toEqual({ x: 100, y: 50, zoom: 2 });
    expect(state.past).toHaveLength(0);
  });
});
