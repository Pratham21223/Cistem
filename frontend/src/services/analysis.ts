import { projectCanvasToGraph, semanticSignature } from "@/engine/projection";
import { ANALYSIS_DEBOUNCE_MS } from "@/lib/constants";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useCanvasStore } from "@/stores/canvasStore";

/** Synchronous projection pass — used before persisting so the stored graph matches the canvas. */
export function projectArchitectureNow(): void {
  const { nodes, edges } = useCanvasStore.getState();
  useArchitectureStore.getState().applyProjection(projectCanvasToGraph({ nodes, edges }));
}

/**
 * Watches the canvas for meaning-bearing changes and projects the graph after a short
 * debounce. Geometry-only changes produce the same semantic signature and are ignored
 * (`architecture.md` §2.3). Cross-store workflow lives here, never in components.
 */
export function startArchitectureAnalysis(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSignature = "";

  const projectNow = (): void => {
    timer = null;
    const { nodes, edges } = useCanvasStore.getState();
    useArchitectureStore.getState().applyProjection(projectCanvasToGraph({ nodes, edges }));
  };

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(projectNow, ANALYSIS_DEBOUNCE_MS);
  };

  const unsubscribe = useCanvasStore.subscribe((state) => {
    const signature = semanticSignature({ nodes: state.nodes, edges: state.edges });
    if (signature === lastSignature) return;
    lastSignature = signature;
    schedule();
  });

  lastSignature = semanticSignature(useCanvasStore.getState());
  schedule();

  return () => {
    unsubscribe();
    if (timer !== null) clearTimeout(timer);
  };
}
