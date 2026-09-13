import {
  CACHE_TYPES,
  DATABASE_TYPES,
  componentsOfType,
  connectionsTo,
  defineRule,
  hasAnyType,
  labelOf,
  type Rule,
} from "@/rules/base";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

const MAX_REASONABLE_REQUEST_PATH = 4;

function longestRequestPath(graph: ArchitectureGraph): string[] {
  const outgoing = new Map<string, string[]>();
  for (const connection of graph.connections) {
    if (connection.type !== "request_flow") continue;
    const list = outgoing.get(connection.source_entity_id) ?? [];
    list.push(connection.target_entity_id);
    outgoing.set(connection.source_entity_id, list);
  }

  let longest: string[] = [];
  const visit = (node: string, path: string[], seen: Set<string>): void => {
    if (path.length > longest.length) longest = [...path];
    for (const next of outgoing.get(node) ?? []) {
      if (seen.has(next)) continue;
      visit(next, [...path, next], new Set([...seen, next]));
    }
  };
  for (const component of graph.components) {
    visit(component.id, [component.id], new Set([component.id]));
  }
  return longest;
}

export const performanceRules: Rule[] = [
  defineRule({
    id: "performance.database_hotspot",
    dimension: "performance",
    description: "A database receiving many direct reads without a cache.",
    evaluate: (graph) => {
      if (hasAnyType(graph, CACHE_TYPES)) return [];
      return componentsOfType(graph, DATABASE_TYPES).flatMap((database) => {
        const readers = connectionsTo(graph, database.id).filter(
          (connection) => connection.type === "data_flow" || connection.type === "request_flow",
        );
        if (readers.length < 3) return [];
        return [
          {
            rule_id: "performance.database_hotspot",
            severity: "suggestion",
            title: `${labelOf(graph, database.id)} receives many direct data flows`,
            description: `${readers.length} components read from ${labelOf(graph, database.id)} with no cache in between.`,
            why_it_matters:
              "The database becomes the latency bottleneck and saturates before the application tier does.",
            recommendation: "Cache the hot read paths in front of the database.",
            alternatives: ["Read replica for reporting", "Managed cache"],
            affected_entity_ids: [database.id, ...readers.map((connection) => connection.source_entity_id)],
          },
        ];
      });
    },
  }),

  defineRule({
    id: "performance.synchronous_path_long",
    dimension: "performance",
    description: "Long synchronous request chains.",
    evaluate: (graph) => {
      const path = longestRequestPath(graph);
      if (path.length < MAX_REASONABLE_REQUEST_PATH) return [];
      return [
        {
          rule_id: "performance.synchronous_path_long",
          severity: "suggestion",
          title: "Long synchronous request path",
          description: `A request flow passes through ${path.length} components before completing.`,
          why_it_matters:
            "Each hop adds latency and failure probability to the critical path.",
          recommendation: "Move non-critical work to asynchronous processing or shorten the chain.",
          alternatives: ["Queue plus worker", "Precomputed responses"],
          affected_entity_ids: path,
        },
      ];
    },
  }),
];
