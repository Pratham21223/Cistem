import { create } from "zustand";

import { createEmptyGraph, type ArchitectureGraph } from "@/types/architecture";

type ArchitectureStoreState = {
  graph: ArchitectureGraph;
  setGraph: (graph: ArchitectureGraph) => void;
  resetGraph: () => void;
};

/**
 * Owns semantic meaning only (components, connections, requirements, assumptions).
 * Never contains pixel geometry; projection from the canvas model arrives in P2.
 */
export const useArchitectureStore = create<ArchitectureStoreState>()((set) => ({
  graph: createEmptyGraph(),
  setGraph: (graph) => {
    set({ graph });
  },
  resetGraph: () => {
    set({ graph: createEmptyGraph() });
  },
}));
