import { describe, expect, it } from "vitest";

import { projectCanvasToGraph, semanticSignature } from "@/engine/projection";
import type { CanvasEdge, CanvasNode, NoteNode, SemanticNode, TextNode } from "@/types/canvas";

function semantic(id: string, overrides: Partial<SemanticNode> = {}): SemanticNode {
  return {
    id,
    type: "semantic",
    position: { x: 0, y: 0 },
    width: 176,
    height: 64,
    data: {},
    label: `Node ${id}`,
    componentType: "api_service",
    category: "compute",
    provenance: "user_selected",
    confidence: 1,
    ...overrides,
  };
}

function edge(id: string, source: string, target: string): CanvasEdge {
  return { id, source, target, type: "request_flow" };
}

describe("projectCanvasToGraph", () => {
  it("projects semantic nodes into components with provenance intact", () => {
    const graph = projectCanvasToGraph({
      nodes: [semantic("a", { provenance: "user_drawn", confidence: null })],
      edges: [],
    });

    expect(graph.components).toEqual([
      {
        id: "a",
        type: "api_service",
        label: "Node a",
        category: "compute",
        source: "user_drawn",
        confidence: null,
        metadata: {},
      },
    ]);
  });

  it("projects typed edges between semantic nodes into connections", () => {
    const nodes: CanvasNode[] = [semantic("a"), semantic("b", { componentType: "postgresql" })];
    const edges: CanvasEdge[] = [
      edge("e1", "a", "b"),
      { ...edge("e2", "a", "b"), type: "data_flow", label: "writes" },
    ];

    const graph = projectCanvasToGraph({ nodes, edges });

    expect(graph.connections).toEqual([
      {
        id: "e1",
        sourceEntityId: "a",
        targetEntityId: "b",
        type: "request_flow",
        label: null,
        source: "user_drawn",
        confidence: null,
      },
      expect.objectContaining({ id: "e2", type: "data_flow", label: "writes" }),
    ]);
  });

  it("ignores edges that touch non-semantic nodes", () => {
    const text: TextNode = {
      id: "t1",
      type: "text",
      text: "hello",
      variant: "text",
      position: { x: 0, y: 0 },
      width: 100,
      height: 30,
      data: {},
    };
    const graph = projectCanvasToGraph({
      nodes: [semantic("a"), text],
      edges: [edge("e1", "a", "t1"), edge("e2", "t1", "a")],
    });

    expect(graph.connections).toEqual([]);
  });

  it("turns text and notes into requirements with the original wording preserved", () => {
    const text: TextNode = {
      id: "t1",
      type: "text",
      text: "  Handle 1M daily active users ",
      variant: "text",
      position: { x: 0, y: 0 },
      width: 100,
      height: 30,
      data: {},
    };
    const note: NoteNode = {
      id: "n1",
      type: "note",
      text: "must be cheap",
      position: { x: 0, y: 0 },
      width: 100,
      height: 100,
      data: {},
    };
    const empty: TextNode = { ...text, id: "t2", text: "   " };

    const graph = projectCanvasToGraph({ nodes: [text, note, empty], edges: [] });

    expect(graph.requirements).toHaveLength(2);
    expect(graph.requirements[0]).toEqual({
      id: "t1",
      kind: "other",
      value: null,
      originalText: "  Handle 1M daily active users ",
      source: "user_typed",
      confidence: null,
    });
    expect(graph.requirements[1]?.id).toBe("n1");
  });

  it("never upgrades a generic component type into a specific technology", () => {
    const graph = projectCanvasToGraph({
      nodes: [semantic("db", { componentType: "database", label: "DB", category: "unknown" })],
      edges: [],
    });

    expect(graph.components[0]?.type).toBe("database");
    expect(graph.components[0]?.category).toBe("unknown");
  });

  it("is unaffected by geometry-only changes", () => {
    const before = projectCanvasToGraph({ nodes: [semantic("a")], edges: [] });
    const moved = semantic("a", { position: { x: 420, y: 300 } });
    moved.width = 320;
    moved.height = 90;
    const after = projectCanvasToGraph({ nodes: [moved], edges: [] });

    expect(after).toEqual(before);
  });
});

describe("semanticSignature", () => {
  it("ignores geometry but detects text and edge changes", () => {
    const base = semanticSignature({ nodes: [semantic("a")], edges: [] });
    const moved = semantic("a", { position: { x: 99, y: 99 } });
    const movedSignature = semanticSignature({ nodes: [moved], edges: [] });
    const relabeled = semanticSignature({
      nodes: [semantic("a", { label: "Renamed" })],
      edges: [],
    });
    const connected = semanticSignature({ nodes: [semantic("a")], edges: [edge("e", "a", "a")] });

    expect(movedSignature).toBe(base);
    expect(relabeled).not.toBe(base);
    expect(connected).not.toBe(base);
  });
});
