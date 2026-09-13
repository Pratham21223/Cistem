import {
  CACHE_TYPES,
  CONSUMER_TYPES,
  DATABASE_TYPES,
  MESSAGING_TYPES,
  SUPPORTED_SCALE_THRESHOLD,
  componentsOfType,
  hasAnyType,
  hasRequirement,
  scaleOf,
} from "@/rules/base";
import { detectComponentCandidates } from "@/services/requirement-service";
import type { ArchitectureGraph, Provenance } from "@/validation/architecture.schemas";

export type SuggestionRecord = {
  id: string;
  kind: "add_component" | "add_connection" | "change_component" | "remove_component" | "reconsider";
  payload: Record<string, unknown>;
  rationale: string;
  source: Provenance;
  status: "proposed";
};

/** Suggestions are always optional, explainable, and never auto-applied (`context.md` §25). */
export function buildSuggestions(graph: ArchitectureGraph): SuggestionRecord[] {
  const suggestions: SuggestionRecord[] = [];
  const scale = scaleOf(graph);
  const modest = scale !== null && scale < SUPPORTED_SCALE_THRESHOLD;

  for (const messaging of componentsOfType(graph, MESSAGING_TYPES)) {
    const hasConsumer = graph.connections.some((connection) => {
      if (connection.source_entity_id !== messaging.id) return false;
      const target = graph.components.find(
        (component) => component.id === connection.target_entity_id,
      );
      return target ? CONSUMER_TYPES.has(target.type) : false;
    });
    if (hasConsumer) continue;
    suggestions.push({
      id: crypto.randomUUID(),
      kind: "add_component",
      payload: {
        type: "worker",
        label: "Worker",
        category: "compute",
        connectFrom: messaging.id,
        connectType: "request_flow",
      },
      rationale: `${messaging.label} has no consumer; a worker completes the asynchronous path.`,
      source: "ai_suggested",
      status: "proposed",
    });
  }

  if (hasRequirement(graph, "realtime")) {
    const hasRealtimePath = hasAnyType(graph, new Set(["kafka", "queue", "event_bus", "redis"]));
    if (!hasRealtimePath && !modest) {
      suggestions.push({
        id: crypto.randomUUID(),
        kind: "add_component",
        payload: { type: "api_service", label: "Realtime Gateway", category: "compute" },
        rationale:
          "A realtime requirement is captured; a dedicated gateway keeps long-lived connections off request APIs.",
        source: "ai_suggested",
        status: "proposed",
      });
    }
  }

  if (
    componentsOfType(graph, DATABASE_TYPES).length > 0 &&
    !hasAnyType(graph, CACHE_TYPES) &&
    !modest
  ) {
    suggestions.push({
      id: crypto.randomUUID(),
      kind: "add_component",
      payload: { type: "cache", label: "Cache", category: "storage" },
      rationale: "Databases under read load usually benefit from a cache. Choose the technology later.",
      source: "ai_suggested",
      status: "proposed",
    });
  }

  const textSources = [
    ...graph.requirements.map((requirement) => requirement.original_text),
    ...graph.components.map((component) => component.label),
  ];
  for (const candidate of detectComponentCandidates(textSources)) {
    const alreadyPresent =
      graph.components.some((component) => component.type === candidate.type) ||
      suggestions.some((suggestion) => suggestion.payload.type === candidate.type);
    if (alreadyPresent) continue;
    suggestions.push({
      id: crypto.randomUUID(),
      kind: "add_component",
      payload: {
        type: candidate.type,
        label: candidate.label,
        category: candidate.category,
        confidence: candidate.confidence,
      },
      rationale: candidate.rationale,
      source: "ai_suggested",
      status: "proposed",
    });
  }

  return suggestions;
}
