import type {
  ArchitectureConnection,
  ArchitectureGraph,
  Requirement,
} from "@/validation/architecture.schemas";

function labelFor(graph: ArchitectureGraph, entityId: string): string {
  return graph.components.find((component) => component.id === entityId)?.label ?? entityId;
}

function formatRequirement(requirement: Requirement): string {
  const value = requirement.value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (requirement.kind === "scale" && typeof record.users === "number") {
      const unit = typeof record.unit === "string" ? record.unit : "users";
      return `${record.users.toLocaleString("en-US")} ${unit}`;
    }
    if (requirement.kind === "latency" && typeof record.ms === "number") {
      return `under ${record.ms}ms latency`;
    }
    if (requirement.kind === "availability" && typeof record.target === "string") {
      return `${record.target} availability`;
    }
  }
  return requirement.original_text;
}

function flowLines(graph: ArchitectureGraph, types: ArchitectureConnection["type"][]): string[] {
  return graph.connections
    .filter((connection) => types.includes(connection.type))
    .map(
      (connection) =>
        `${labelFor(graph, connection.source_entity_id)} → ${labelFor(graph, connection.target_entity_id)}`,
    );
}

/** Deterministic system-design prompt (`context.md` §20). Works with no AI configured. */
export function buildSystemDesignPrompt(graph: ArchitectureGraph): string {
  const lines: string[] = [];
  const applicationName = graph.application?.name ?? "system";

  lines.push(`Design a scalable ${applicationName}.`, "");

  lines.push("Requirements:");
  if (graph.requirements.length === 0) {
    lines.push("- No explicit requirements captured yet.");
  } else {
    for (const requirement of graph.requirements) {
      lines.push(`- ${formatRequirement(requirement)}`);
    }
  }
  lines.push("");

  lines.push("Current architecture:");
  if (graph.components.length === 0) {
    lines.push("- No components defined yet.");
  } else {
    for (const component of graph.components) {
      lines.push(`- ${component.label} (${component.type})`);
    }
  }
  lines.push("");

  const traffic = flowLines(graph, ["request_flow", "event_flow", "dependency"]);
  lines.push("Traffic:");
  lines.push(...(traffic.length > 0 ? traffic.map((line) => `- ${line}`) : ["- No request flows yet."]));
  lines.push("");

  const data = flowLines(graph, ["data_flow", "replication"]);
  lines.push("Data:");
  lines.push(...(data.length > 0 ? data.map((line) => `- ${line}`) : ["- No data flows yet."]));
  lines.push("");

  lines.push("Review for:");
  for (const dimension of [
    "scalability",
    "reliability",
    "performance",
    "security",
    "cost",
    "simplicity",
  ]) {
    lines.push(`- ${dimension}`);
  }
  lines.push("");

  lines.push("Identify:");
  for (const item of ["missing components", "bottlenecks", "risks", "tradeoffs"]) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n");
}
