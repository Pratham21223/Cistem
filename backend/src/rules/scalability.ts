import {
  API_TYPES,
  CACHE_TYPES,
  CONSUMER_TYPES,
  DATABASE_TYPES,
  EDGE_PROXY_TYPES,
  MESSAGING_TYPES,
  SUPPORTED_SCALE_THRESHOLD,
  componentsOfType,
  connectionsFrom,
  defineRule,
  hasAnyType,
  hasRequirement,
  labelOf,
  scaleOf,
  type Rule,
} from "@/rules/base";

export const scalabilityRules: Rule[] = [
  defineRule({
    id: "scalability.load_balancer_missing",
    dimension: "scalability",
    description: "Multiple API instances without a distribution layer.",
    evaluate: (graph) => {
      const apis = componentsOfType(graph, API_TYPES);
      if (apis.length < 2 || hasAnyType(graph, EDGE_PROXY_TYPES)) return [];
      return [
        {
          rule_id: "scalability.load_balancer_missing",
          severity: "warning",
          title: "Traffic distribution mechanism may be missing",
          description: `There are ${apis.length} API-capable components but no load balancer, API gateway, or reverse proxy.`,
          why_it_matters:
            "Without a distribution layer, traffic cannot be spread across instances and one instance becomes the bottleneck.",
          recommendation: "Add a load balancer or API gateway in front of the API instances.",
          alternatives: ["Managed load balancer", "API gateway with routing"],
          affected_entity_ids: apis.map((component) => component.id),
        },
      ];
    },
  }),

  defineRule({
    id: "scalability.cache_missing",
    dimension: "scalability",
    description: "Database-backed APIs without a cache layer.",
    evaluate: (graph) => {
      const databases = componentsOfType(graph, DATABASE_TYPES);
      const apis = componentsOfType(graph, API_TYPES);
      if (databases.length === 0 || apis.length === 0 || hasAnyType(graph, CACHE_TYPES)) return [];
      const scale = scaleOf(graph);
      if (scale !== null && scale < SUPPORTED_SCALE_THRESHOLD) return [];
      return [
        {
          rule_id: "scalability.cache_missing",
          severity: "suggestion",
          title: "No cache layer in front of the database",
          description: "Read-heavy APIs usually benefit from a cache between the API and the database.",
          why_it_matters:
            "Every repeated read hits the primary database, which limits throughput as traffic grows.",
          recommendation: "Introduce a cache for hot read paths.",
          alternatives: ["Managed cache", "Application-level caching"],
          affected_entity_ids: [
            ...databases.map((component) => component.id),
            ...apis.map((component) => component.id),
          ],
        },
      ];
    },
  }),

  defineRule({
    id: "scalability.messaging_consumer_missing",
    dimension: "scalability",
    description: "Message broker or queue without a visible consumer.",
    evaluate: (graph) =>
      componentsOfType(graph, MESSAGING_TYPES).flatMap((component) => {
        const consumers = connectionsFrom(graph, component.id).filter((connection) => {
          const target = graph.components.find(
            (candidate) => candidate.id === connection.target_entity_id,
          );
          return target ? CONSUMER_TYPES.has(target.type) : false;
        });
        if (consumers.length > 0) return [];
        return [
          {
            rule_id: "scalability.messaging_consumer_missing",
            severity: "warning",
            title: `${labelOf(graph, component.id)} has no visible downstream consumer`,
            description: `${labelOf(graph, component.id)} exists but nothing consumes from it, so messages accumulate with no processing path.`,
            why_it_matters:
              "An unconsumed stream or queue keeps growing and the work it represents is never done.",
            recommendation: "Connect a worker/consumer to the messaging component.",
            alternatives: ["Worker service", "Serverless consumer"],
            affected_entity_ids: [component.id],
          },
        ];
      }),
  }),

  defineRule({
    id: "scalability.horizontal_scaling_missing",
    dimension: "scalability",
    description: "High scale target without horizontal scaling primitives.",
    evaluate: (graph) => {
      const apis = componentsOfType(graph, API_TYPES);
      const scale = scaleOf(graph);
      if (apis.length !== 1 || scale === null || scale < SUPPORTED_SCALE_THRESHOLD) return [];
      if (hasAnyType(graph, EDGE_PROXY_TYPES) || hasRequirement(graph, "availability")) return [];
      return [
        {
          rule_id: "scalability.horizontal_scaling_missing",
          severity: "warning",
          title: "Single API component for a high scale target",
          description: `The scale requirement targets ${scale.toLocaleString("en-US")} users but only one API component is modeled.`,
          why_it_matters:
            "A single API component cannot scale horizontally and becomes the first bottleneck under load.",
          recommendation:
            "Model stateless API instances behind a distribution layer, or mark the component as horizontally scaled.",
          alternatives: ["Managed autoscaling group", "Serverless API"],
          affected_entity_ids: apis.map((component) => component.id),
        },
      ];
    },
  }),
];
