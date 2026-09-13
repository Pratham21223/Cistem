import { ShieldCheck } from "lucide-react";

import { PanelEmptyState } from "@/components/context/PanelEmptyState";
import { useCanvasStore } from "@/stores/canvasStore";

const REVIEW_DIMENSIONS = [
  "Scalability",
  "Reliability",
  "Performance",
  "Security",
  "Cost",
  "Simplicity",
];

export function ReviewPanel() {
  const nodeCount = useCanvasStore((state) => state.nodes.length);

  return (
    <PanelEmptyState
      icon={ShieldCheck}
      tone="success"
      title={nodeCount === 0 ? "No review yet" : "Ready when you are"}
    >
      {nodeCount === 0
        ? "Draw an architecture first — Cistem needs something to check."
        : "The deterministic reviewer arrives in Phase P5. It will check six dimensions:"}
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-left">
        {REVIEW_DIMENSIONS.map((dimension) => (
          <li key={dimension} className="flex items-center gap-1.5 text-caption text-text-muted">
            <span className="h-1 w-1 rounded-full bg-accent/70" aria-hidden />
            {dimension}
          </li>
        ))}
      </ul>
    </PanelEmptyState>
  );
}
