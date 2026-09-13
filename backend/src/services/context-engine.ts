import type { z } from "zod";

import { runRules } from "@/rules/registry";
import {
  CACHE_TYPES,
  API_TYPES,
  DATABASE_TYPES,
  componentsOfType,
  hasAnyType,
  hasRequirement,
  scaleOf,
} from "@/rules/base";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";
import type { assumptionSchema } from "@/validation/architecture.schemas";
import type { contextDocumentSchema } from "@/validation/context.schemas";

type ContextConcern = { title: string; description: string };
type ContextAssumption = z.infer<typeof assumptionSchema>;
export type ContextDocument = z.infer<typeof contextDocumentSchema>;

const SEVERITY_ORDER = { critical: 0, warning: 1, suggestion: 2, info: 3 } as const;

function buildAssumptions(graph: ArchitectureGraph): ContextAssumption[] {
  const assumptions: ContextAssumption[] = [];
  const add = (text: string): void => {
    assumptions.push({
      id: crypto.randomUUID(),
      text,
      status: "pending",
      source: "template_generated",
      confidence: null,
    });
  };

  if (hasRequirement(graph, "scale")) add("Scale figures refer to the stated unit (for example daily active users).");
  if (hasAnyType(graph, API_TYPES)) add("API components are treated as stateless for scaling purposes.");
  if (hasAnyType(graph, CACHE_TYPES)) add("The cache is not the source of truth.");
  if (componentsOfType(graph, DATABASE_TYPES).length > 0) add("The database is the primary source of truth.");
  return assumptions;
}

function buildOpenQuestions(graph: ArchitectureGraph): string[] {
  const questions: string[] = [];
  if (!hasRequirement(graph, "scale")) questions.push("What scale should the system handle (users or requests per second)?");
  if (!hasRequirement(graph, "latency")) questions.push("What latency target matters most for critical flows?");
  if (!hasRequirement(graph, "availability")) questions.push("What availability target is required (for example 99.9%)?");
  if (componentsOfType(graph, DATABASE_TYPES).length === 0) questions.push("What is the primary data store?");
  if (hasRequirement(graph, "realtime") && !hasAnyType(graph, new Set(["kafka", "queue", "event_bus", "redis"]))) {
    questions.push("Does the realtime requirement need long-lived connections or polling?");
  }
  if (componentsOfType(graph, API_TYPES).length > 0 && !hasAnyType(graph, new Set(["authentication", "identity_provider"]))) {
    questions.push("How are users authenticated?");
  }
  return questions;
}

function summarize(graph: ArchitectureGraph): string {
  const name = graph.application?.name ?? "this system";
  if (graph.components.length === 0) {
    return `${name} has no components modeled yet. Add components or describe the system to build understanding.`;
  }
  const pieces = [
    `${name} uses ${graph.components.length} component${graph.components.length === 1 ? "" : "s"} and ${graph.connections.length} connection${graph.connections.length === 1 ? "" : "s"}`,
  ];
  const scale = scaleOf(graph);
  if (scale !== null) pieces.push(`targeting ${scale.toLocaleString("en-US")} users`);
  const kinds = [...new Set(graph.requirements.map((requirement) => requirement.kind))];
  if (kinds.length > 0) pieces.push(`with ${kinds.join(", ")} requirements captured`);
  return `${pieces.join(", ")}.`;
}

/**
 * Deterministic context engine (`build-plan.md` §11): analysis → … → architecture graph → context.
 * AI enrichment is layered on top in P7 when a provider is configured.
 */
export function buildContextDocument(graph: ArchitectureGraph): ContextDocument {
  const concerns: ContextConcern[] = runRules(graph)
    .filter((finding) => finding.severity === "critical" || finding.severity === "warning")
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 5)
    .map((finding) => ({ title: finding.title, description: finding.why_it_matters }));

  return {
    application: graph.application,
    scale:
      scaleOf(graph) !== null
        ? `${scaleOf(graph)?.toLocaleString("en-US")} ${
            (graph.requirements.find((requirement) => requirement.kind === "scale")?.value as { unit?: string })
              ?.unit ?? "users"
          }`
        : null,
    requirements: graph.requirements,
    components: graph.components,
    connections: graph.connections,
    flows: graph.connections.map((connection) => ({
      from_entity_id: connection.source_entity_id,
      to_entity_id: connection.target_entity_id,
      type: connection.type,
    })),
    concerns,
    assumptions: buildAssumptions(graph),
    open_questions: buildOpenQuestions(graph),
    summary: summarize(graph),
    updated_at: new Date().toISOString(),
  };
}
