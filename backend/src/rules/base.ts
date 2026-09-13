import type {
  ArchitectureComponent,
  ArchitectureConnection,
  ArchitectureGraph,
  RequirementKind,
} from "@/validation/architecture.schemas";

export type FindingSeverity = "info" | "suggestion" | "warning" | "critical";

export type RuleDimension =
  | "scalability"
  | "reliability"
  | "performance"
  | "security"
  | "cost"
  | "simplicity";

export type RuleFinding = {
  rule_id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  why_it_matters: string;
  recommendation: string;
  alternatives: string[];
  affected_entity_ids: string[];
};

export type Rule = {
  id: string;
  dimension: RuleDimension;
  description: string;
  evaluate: (graph: ArchitectureGraph) => RuleFinding[];
};

/** Component-type groups used by rules. Types come from the knowledge base. */
export const API_TYPES = new Set(["api_service", "serverless_function", "container"]);
export const EDGE_PROXY_TYPES = new Set(["load_balancer", "api_gateway", "reverse_proxy"]);
export const DATABASE_TYPES = new Set([
  "postgresql",
  "mysql",
  "mongodb",
  "cassandra",
  "dynamodb",
]);
export const CACHE_TYPES = new Set(["redis"]);
export const MESSAGING_TYPES = new Set(["kafka", "rabbitmq", "queue", "event_bus"]);
export const CONSUMER_TYPES = new Set(["worker", "serverless_function", "file_processing"]);
export const AUTH_TYPES = new Set(["authentication", "identity_provider"]);
export const RATE_LIMIT_TYPES = new Set(["rate_limiter", "waf"]);
export const HEAVY_INFRA_TYPES = new Set([
  "kafka",
  "kubernetes_cluster",
  "cassandra",
  "dynamodb",
  "elasticsearch",
]);

export const SUPPORTED_SCALE_THRESHOLD = 100_000;

export function componentsOfType(
  graph: ArchitectureGraph,
  types: Set<string>,
): ArchitectureComponent[] {
  return graph.components.filter((component) => types.has(component.type));
}

export function hasAnyType(graph: ArchitectureGraph, types: Set<string>): boolean {
  return graph.components.some((component) => types.has(component.type));
}

export function hasRequirement(graph: ArchitectureGraph, kind: RequirementKind): boolean {
  return graph.requirements.some((requirement) => requirement.kind === kind);
}

export function scaleOf(graph: ArchitectureGraph): number | null {
  const requirement = graph.requirements.find((candidate) => candidate.kind === "scale");
  const value = requirement?.value;
  if (value && typeof value === "object" && "users" in value) {
    const users = (value as { users?: unknown }).users;
    return typeof users === "number" ? users : null;
  }
  return null;
}

export function connectionsFrom(
  graph: ArchitectureGraph,
  entityId: string,
): ArchitectureConnection[] {
  return graph.connections.filter((connection) => connection.source_entity_id === entityId);
}

export function connectionsTo(
  graph: ArchitectureGraph,
  entityId: string,
): ArchitectureConnection[] {
  return graph.connections.filter((connection) => connection.target_entity_id === entityId);
}

export function labelOf(graph: ArchitectureGraph, entityId: string): string {
  return graph.components.find((component) => component.id === entityId)?.label ?? entityId;
}

/** Rules stay pure: same graph in, same findings out (`code-standards.md` §8). */
export function defineRule(rule: Rule): Rule {
  return rule;
}
