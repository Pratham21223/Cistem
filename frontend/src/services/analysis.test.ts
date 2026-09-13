import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANALYSIS_DEBOUNCE_MS } from "@/lib/constants";
import { startArchitectureAnalysis } from "@/services/analysis";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { createEmptyGraph } from "@/types/architecture";
import type { CanvasDocument, SemanticNode } from "@/types/canvas";

function emptyDocument(): CanvasDocument {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    strokes: [],
    comments: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function semantic(id: string): SemanticNode {
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
  };
}

describe("startArchitectureAnalysis", () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    useCanvasStore.getState().loadDocument(emptyDocument());
    useArchitectureStore.setState({ graph: createEmptyGraph(), revision: 0 });
    stop = startArchitectureAnalysis();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it("projects semantic changes after the debounce", () => {
    useCanvasStore.getState().addNode(semantic("a"));
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);

    expect(useArchitectureStore.getState().graph.components).toHaveLength(1);
  });

  it("does not react to geometry-only changes", () => {
    useCanvasStore.getState().addNode(semantic("a"));
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);
    const before = useArchitectureStore.getState().graph;

    useCanvasStore.getState().updateNode("a", (node) => ({
      ...node,
      position: { x: 999, y: 999 },
    }));
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);

    expect(useArchitectureStore.getState().graph).toEqual(before);
  });

  it("removes components when semantic nodes are deleted", () => {
    useCanvasStore.getState().addNode(semantic("a"));
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);
    expect(useArchitectureStore.getState().graph.components).toHaveLength(1);

    useCanvasStore.getState().removeNodes(["a"]);
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);
    expect(useArchitectureStore.getState().graph.components).toHaveLength(0);
  });

  it("stops on unsubscribe", () => {
    stop();
    useCanvasStore.getState().addNode(semantic("a"));
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1);

    expect(useArchitectureStore.getState().graph.components).toHaveLength(0);
  });
});
