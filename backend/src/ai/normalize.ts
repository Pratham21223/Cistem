import type { AiDraftGraph } from "@/ai/schemas";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

const EXPLICIT_SOURCES = new Set(["user_selected", "user_typed", "user_drawn"]);

function defaultConfidence(source: string, provided: number | null | undefined): number | null {
  if (provided !== undefined) return provided;
  return EXPLICIT_SOURCES.has(source) ? null : 0.6;
}

/**
 * Normalizes lenient model output into the strict `ArchitectureGraph` contract.
 * Missing ids are generated; provenance defaults to `ai_inferred`; no entity is dropped
 * silently except invalid self-referencing connections.
 */
export function normalizeDraftGraph(draft: AiDraftGraph): ArchitectureGraph {
  const components = draft.components.map((component) => {
    const source = component.source ?? "ai_inferred";
    return {
      id: component.id ?? crypto.randomUUID(),
      type: component.type,
      label: component.label,
      category: component.category ?? "unknown",
      source,
      confidence: defaultConfidence(source, component.confidence),
      metadata: component.metadata ?? {},
    };
  });

  const componentIds = new Set(components.map((component) => component.id));
  const connections = draft.connections
    .filter(
      (connection) =>
        connection.source_entity_id !== connection.target_entity_id &&
        componentIds.has(connection.source_entity_id) &&
        componentIds.has(connection.target_entity_id),
    )
    .map((connection) => {
      const source = connection.source ?? "ai_inferred";
      return {
        id: connection.id ?? crypto.randomUUID(),
        source_entity_id: connection.source_entity_id,
        target_entity_id: connection.target_entity_id,
        type: connection.type ?? "dependency",
        label: connection.label ?? null,
        source,
        confidence: defaultConfidence(source, connection.confidence),
      };
    });

  const requirements = draft.requirements.map((requirement) => {
    const source = requirement.source ?? "ai_inferred";
    return {
      id: requirement.id ?? crypto.randomUUID(),
      kind: requirement.kind,
      value: requirement.value ?? null,
      original_text: requirement.original_text,
      source,
      confidence: defaultConfidence(source, requirement.confidence),
    };
  });

  return {
    application: draft.application
      ? { name: draft.application.name, domain: draft.application.domain ?? null }
      : null,
    components,
    connections,
    requirements,
    assumptions: [],
  };
}
