import type {
  ArchitectureConnection,
  ArchitectureGraph,
  ComponentCategory,
  Provenance,
  Requirement,
  RequirementKind,
} from "@/validation/architecture.schemas";

/**
 * Deterministic UUIDs for short test ids, so fixtures stay readable while satisfying the
 * UUID-typed wire contract.
 */
export function uuidFor(key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const character of key) {
    h1 = Math.imul(h1 ^ character.charCodeAt(0), 16_777_619) >>> 0;
    h2 = Math.imul(h2 + character.charCodeAt(0), 2_654_435_761) >>> 0;
  }
  const hex = (value: number): string => (value >>> 0).toString(16).padStart(8, "0");
  const segmentA = hex(h1);
  const segmentB = hex(h2).slice(0, 4);
  const segmentC = `4${hex(h2 ^ 0x9e37).slice(0, 3)}`;
  const segmentD = `a${hex(h1 ^ 0x85eb).slice(0, 3)}`;
  const segmentE = `${hex(h1 ^ h2)}${hex(h2)}`.slice(0, 12);
  return `${segmentA}-${segmentB}-${segmentC}-${segmentD}-${segmentE}`;
}

export function component(
  id: string,
  type: string,
  options: { label?: string; category?: ComponentCategory; source?: Provenance } = {},
) {
  return {
    id: uuidFor(id),
    type,
    label: options.label ?? id,
    category: options.category ?? "compute",
    source: options.source ?? "user_selected",
    confidence: null,
    metadata: {},
  };
}

export function connection(
  id: string,
  sourceEntityId: string,
  targetEntityId: string,
  type: ArchitectureConnection["type"] = "request_flow",
) {
  return {
    id: uuidFor(id),
    source_entity_id: uuidFor(sourceEntityId),
    target_entity_id: uuidFor(targetEntityId),
    type,
    label: null,
    source: "user_drawn" as const,
    confidence: null,
  };
}

export function requirement(
  kind: RequirementKind,
  originalText: string,
  value: unknown = null,
): Requirement {
  return {
    id: crypto.randomUUID(),
    kind,
    value,
    original_text: originalText,
    source: "user_typed",
    confidence: null,
  };
}

export function scaleRequirement(users: number): Requirement {
  return requirement("scale", `${users} users`, { users, unit: "users" });
}

export function graph(partial: Partial<ArchitectureGraph> = {}): ArchitectureGraph {
  return {
    application: partial.application ?? null,
    components: partial.components ?? [],
    connections: partial.connections ?? [],
    requirements: partial.requirements ?? [],
    assumptions: partial.assumptions ?? [],
  };
}
