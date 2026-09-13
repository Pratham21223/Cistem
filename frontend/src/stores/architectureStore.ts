import { create } from "zustand";

import { createEmptyGraph, type ArchitectureGraph } from "@/types/architecture";

type ArchitectureStoreState = {
  graph: ArchitectureGraph;
  revision: number;
  /** Full replace: project load, snapshot restore, or import. */
  setGraph: (graph: ArchitectureGraph) => void;
  /** Canvas projection result: replaces canvas-derived entities, keeps app/assumptions. */
  applyProjection: (graph: ArchitectureGraph) => void;
  clearGraph: () => void;
};

/** Owns the semantic graph: application, components, connections, requirements, assumptions. */
export const useArchitectureStore = create<ArchitectureStoreState>()((set) => ({
  graph: createEmptyGraph(),
  revision: 0,

  setGraph: (graph) => {
    set((state) => ({ graph, revision: state.revision + 1 }));
  },

  applyProjection: (projected) => {
    set((state) => ({
      graph: {
        application: state.graph.application ?? projected.application,
        components: projected.components,
        connections: projected.connections,
        requirements: projected.requirements,
        assumptions: state.graph.assumptions,
      },
      revision: state.revision + 1,
    }));
  },

  clearGraph: () => {
    set((state) => ({ graph: createEmptyGraph(), revision: state.revision + 1 }));
  },
}));
