import { Compass } from "lucide-react";

import { PanelEmptyState } from "@/components/context/PanelEmptyState";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import { useContextStore } from "@/stores/contextStore";

export function ContextOverview() {
  const context = useContextStore((state) => state.context);
  const nodeCount = useCanvasStore((state) => state.nodes.length);
  const semanticCount = useCanvasStore(
    (state) => state.nodes.filter((node) => node.type === "semantic").length,
  );
  const textAndNotesCount = useCanvasStore(
    (state) => state.nodes.filter((node) => node.type === "text" || node.type === "note").length,
  );
  const shapeCount = useCanvasStore(
    (state) => state.nodes.filter((node) => node.type === "shape").length,
  );
  const connectionCount = useCanvasStore((state) => state.edges.length);
  const strokeCount = useCanvasStore((state) => state.strokes.length);

  if (context) {
    return (
      <div className="p-4">
        <p className="text-body text-text-secondary">{context.summary}</p>
      </div>
    );
  }

  if (nodeCount === 0) {
    return (
      <PanelEmptyState icon={Compass} tone="info" title="Nothing understood yet">
        Start drawing, drag a component, or describe what you&apos;re building. Cistem starts
        reading the canvas in Phase&nbsp;P2.
      </PanelEmptyState>
    );
  }

  const signals: { label: string; value: number; tone: string }[] = [
    { label: "Components", value: semanticCount, tone: "bg-cat-compute" },
    { label: "Text & notes", value: textAndNotesCount, tone: "bg-cat-observability" },
    { label: "Shapes", value: shapeCount, tone: "bg-cat-networking" },
    { label: "Connections", value: connectionCount, tone: "bg-cat-storage" },
    { label: "Freehand strokes", value: strokeCount, tone: "bg-cat-services" },
  ].filter((signal) => signal.value > 0);

  return (
    <div className="p-3">
      <section className="rounded-lg border border-border bg-surface-secondary/50 p-3">
        <h3 className="text-eyebrow text-text-muted">Signals collected</h3>
        <ul className="mt-2.5 space-y-2">
          {signals.map((signal) => (
            <li key={signal.label} className="flex items-center gap-2.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", signal.tone)} aria-hidden />
              <span className="flex-1 text-body text-text-secondary">{signal.label}</span>
              <span className="font-mono text-caption text-text-primary">{signal.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-caption text-text-muted">
          The understanding engine turns these signals into context in Phase&nbsp;P2.
        </p>
      </section>
    </div>
  );
}
