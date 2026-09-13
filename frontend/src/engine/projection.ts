import type {
  ArchitectureComponent,
  ArchitectureConnection,
  ArchitectureGraph,
  Requirement,
} from "@/types/architecture";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type ProjectionInput = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

/**
 * Pure canvas → architecture projection (P2, `architecture.md` §2.3).
 * Reads only semantic fields, never geometry, so moving/resizing nodes cannot change the
 * graph. Entity ids are the canvas ids, which makes projection idempotent and duplicate-free.
 *
 * It never upgrades uncertainty into specificity: `componentType` is copied verbatim and
 * free text is stored as an unparsed `other` requirement.
 */
export function projectCanvasToGraph({ nodes, edges }: ProjectionInput): ArchitectureGraph {
  const components: ArchitectureComponent[] = [];
  const requirements: Requirement[] = [];

  for (const node of nodes) {
    if (node.type === "semantic") {
      components.push({
        id: node.id,
        type: node.componentType,
        label: node.label,
        category: node.category,
        source: node.provenance,
        confidence: node.confidence,
        metadata: {},
      });
      continue;
    }
    if ((node.type === "text" || node.type === "note") && node.text.trim().length > 0) {
      requirements.push({
        id: node.id,
        kind: "other",
        value: null,
        originalText: node.text,
        source: "user_typed",
        confidence: null,
      });
    }
  }

  const componentIds = new Set(components.map((component) => component.id));
  const connections: ArchitectureConnection[] = edges
    .filter((edge) => componentIds.has(edge.source) && componentIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      sourceEntityId: edge.source,
      targetEntityId: edge.target,
      type: edge.type,
      label: edge.label ?? null,
      source: "user_drawn",
      confidence: null,
    }));

  return {
    application: null,
    components,
    connections,
    requirements,
    assumptions: [],
  };
}

/** Cheap semantic signature: only meaning-bearing fields, never geometry. */
export function semanticSignature({ nodes, edges }: ProjectionInput): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === "semantic") {
      parts.push(
        `s:${node.id}:${node.componentType}:${node.label}:${node.category}:${node.provenance}:${
          node.confidence ?? ""
        }`,
      );
    } else if (node.type === "text" || node.type === "note") {
      parts.push(`t:${node.id}:${node.type}:${node.text}`);
    }
  }
  for (const edge of edges) {
    parts.push(`e:${edge.id}:${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`);
  }
  return parts.join("|");
}
