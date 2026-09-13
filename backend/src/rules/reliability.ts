import {
  API_TYPES,
  DATABASE_TYPES,
  EDGE_PROXY_TYPES,
  SUPPORTED_SCALE_THRESHOLD,
  componentsOfType,
  defineRule,
  hasAnyType,
  hasRequirement,
  scaleOf,
  type Rule,
} from "@/rules/base";

export const reliabilityRules: Rule[] = [
  defineRule({
    id: "reliability.database_replication_missing",
    dimension: "reliability",
    description: "Availability target without a represented replication or failover path.",
    evaluate: (graph) => {
      const databases = componentsOfType(graph, DATABASE_TYPES);
      if (databases.length === 0) return [];
      const hasReplication = graph.connections.some((connection) => connection.type === "replication");
      const needsAvailability =
        hasRequirement(graph, "availability") ||
        (scaleOf(graph) ?? 0) >= SUPPORTED_SCALE_THRESHOLD;
      if (hasReplication || !needsAvailability) return [];
      return [
        {
          rule_id: "reliability.database_replication_missing",
          severity: "warning",
          title: "Database availability strategy is unclear",
          description:
            "The design targets availability but no replication or failover path is represented for the database.",
          why_it_matters:
            "A single unreplicated database is a single point of failure for the whole system.",
          recommendation: "Add a replica and a replication connection, or document the failover strategy.",
          alternatives: ["Managed multi-AZ database", "Read replica plus failover"],
          affected_entity_ids: databases.map((component) => component.id),
        },
      ];
    },
  }),

  defineRule({
    id: "reliability.single_point_of_failure",
    dimension: "reliability",
    description: "One API component serving an availability-sensitive design.",
    evaluate: (graph) => {
      const apis = componentsOfType(graph, API_TYPES);
      if (apis.length !== 1 || hasAnyType(graph, EDGE_PROXY_TYPES)) return [];
      const availabilitySensitive =
        hasRequirement(graph, "availability") ||
        (scaleOf(graph) ?? 0) >= SUPPORTED_SCALE_THRESHOLD;
      if (!availabilitySensitive) return [];
      return [
        {
          rule_id: "reliability.single_point_of_failure",
          severity: "warning",
          title: "Single API component is a single point of failure",
          description: "One API component serves an availability-sensitive design with no redundancy.",
          why_it_matters: "If this component fails, the entire system becomes unavailable.",
          recommendation: "Add redundant API instances behind a distribution layer.",
          alternatives: ["Managed autoscaling", "Multi-instance deployment"],
          affected_entity_ids: apis.map((component) => component.id),
        },
      ];
    },
  }),
];
