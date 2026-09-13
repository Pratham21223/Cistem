import {
  HEAVY_INFRA_TYPES,
  SUPPORTED_SCALE_THRESHOLD,
  componentsOfType,
  defineRule,
  hasRequirement,
  scaleOf,
  type Rule,
} from "@/rules/base";

const SERVICES_CATEGORY_THRESHOLD = 6;

export const simplicityRules: Rule[] = [
  defineRule({
    id: "simplicity.overengineered_stack",
    dimension: "simplicity",
    description: "Several heavyweight infrastructure components in one small design.",
    evaluate: (graph) => {
      const scale = scaleOf(graph);
      if (scale === null || scale >= SUPPORTED_SCALE_THRESHOLD) return [];
      const heavy = componentsOfType(graph, HEAVY_INFRA_TYPES);
      if (heavy.length < 2) return [];
      return [
        {
          rule_id: "simplicity.overengineered_stack",
          severity: "warning",
          title: "Infrastructure complexity exceeds the stated scale",
          description: `${heavy.length} heavyweight components are modeled for ${scale.toLocaleString("en-US")} users.`,
          why_it_matters:
            "Each distributed component adds failure modes, operational work, and cost.",
          recommendation: "Remove components that do not serve a current requirement.",
          alternatives: ["Consolidate on managed services", "Keep a modular monolith"],
          affected_entity_ids: heavy.map((component) => component.id),
        },
      ];
    },
  }),

  defineRule({
    id: "simplicity.multiple_databases_unjustified",
    dimension: "simplicity",
    description: "Multiple database technologies without a stated reason.",
    evaluate: (graph) => {
      const databaseTypes = new Set(componentsOfType(graph, new Set(["postgresql", "mysql", "mongodb", "cassandra", "dynamodb"])).map((component) => component.type));
      if (databaseTypes.size < 2) return [];
      if (hasRequirement(graph, "consistency") || hasRequirement(graph, "scale")) return [];
      return [
        {
          rule_id: "simplicity.multiple_databases_unjustified",
          severity: "suggestion",
          title: "Multiple database technologies without a stated reason",
          description: `The design uses ${[...databaseTypes].join(", ")} but no scale or consistency requirement justifies both.`,
          why_it_matters:
            "Each additional datastore multiplies migration, backup, and operational work.",
          recommendation: "Start with one primary datastore unless a concrete need requires another.",
          alternatives: ["Single primary database", "Document the split explicitly"],
          affected_entity_ids: graph.components
            .filter((component) => databaseTypes.has(component.type))
            .map((component) => component.id),
        },
      ];
    },
  }),

  defineRule({
    id: "simplicity.premature_microservices",
    dimension: "simplicity",
    description: "Service sprawl in a small design.",
    evaluate: (graph) => {
      const scale = scaleOf(graph);
      if (scale === null || scale >= SUPPORTED_SCALE_THRESHOLD) return [];
      const services = graph.components.filter((component) => component.category === "services");
      if (services.length <= SERVICES_CATEGORY_THRESHOLD) return [];
      return [
        {
          rule_id: "simplicity.premature_microservices",
          severity: "suggestion",
          title: "Service count looks premature for the stated scale",
          description: `${services.length} service-category components are modeled for ${scale.toLocaleString("en-US")} users.`,
          why_it_matters:
            "Splitting into many services too early adds network hops and deployment overhead without benefit.",
          recommendation: "Keep related capabilities in one service until scale forces a split.",
          alternatives: ["Modular monolith", "Consolidate related services"],
          affected_entity_ids: services.map((component) => component.id),
        },
      ];
    },
  }),
];
