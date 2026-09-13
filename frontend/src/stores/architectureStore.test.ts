import { beforeEach, describe, expect, it } from "vitest";

import { useArchitectureStore } from "@/stores/architectureStore";
import { createEmptyGraph, type ArchitectureGraph } from "@/types/architecture";

function graphWith(overrides: Partial<ArchitectureGraph> = {}): ArchitectureGraph {
  return {
    ...createEmptyGraph(),
    components: [
      {
        id: "a",
        type: "api_service",
        label: "API",
        category: "compute",
        source: "user_selected",
        confidence: 1,
        metadata: {},
      },
    ],
    ...overrides,
  };
}

describe("architectureStore", () => {
  beforeEach(() => {
    useArchitectureStore.setState({ graph: createEmptyGraph(), revision: 0 });
  });

  it("replaces the graph on setGraph", () => {
    useArchitectureStore.getState().setGraph(graphWith());
    expect(useArchitectureStore.getState().graph.components).toHaveLength(1);

    useArchitectureStore.getState().setGraph(createEmptyGraph());
    expect(useArchitectureStore.getState().graph.components).toHaveLength(0);
  });

  it("keeps imported application and assumptions when a projection lands", () => {
    useArchitectureStore.getState().setGraph(
      graphWith({
        application: { name: "Food delivery", domain: "food_delivery" },
        assumptions: [
          {
            id: "as1",
            text: "Traffic doubles",
            status: "pending",
            source: "ai_inferred",
            confidence: 0.6,
          },
        ],
      }),
    );

    useArchitectureStore.getState().applyProjection(graphWith());
    const graph = useArchitectureStore.getState().graph;

    expect(graph.application).toEqual({ name: "Food delivery", domain: "food_delivery" });
    expect(graph.assumptions).toHaveLength(1);
    expect(graph.components).toHaveLength(1);
  });

  it("clears the graph on clearGraph", () => {
    useArchitectureStore.getState().setGraph(graphWith());
    useArchitectureStore.getState().clearGraph();
    expect(useArchitectureStore.getState().graph).toEqual(createEmptyGraph());
  });
});
