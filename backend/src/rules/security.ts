import {
  API_TYPES,
  AUTH_TYPES,
  EDGE_PROXY_TYPES,
  RATE_LIMIT_TYPES,
  componentsOfType,
  defineRule,
  hasAnyType,
  type Rule,
} from "@/rules/base";

export const securityRules: Rule[] = [
  defineRule({
    id: "security.authentication_missing",
    dimension: "security",
    description: "API surface without a visible authentication component.",
    evaluate: (graph) => {
      const apis = componentsOfType(graph, API_TYPES);
      if (apis.length === 0 || hasAnyType(graph, AUTH_TYPES)) return [];
      return [
        {
          rule_id: "security.authentication_missing",
          severity: "warning",
          title: "No authentication component is represented",
          description: "The design exposes API components but no authentication or identity provider.",
          why_it_matters:
            "Unverified access to API components is the most common source of data exposure.",
          recommendation: "Add an authentication component in front of the API surface.",
          alternatives: ["Identity provider", "Managed auth service"],
          affected_entity_ids: apis.map((component) => component.id),
        },
      ];
    },
  }),

  defineRule({
    id: "security.rate_limiter_missing",
    dimension: "security",
    description: "Public entry point without rate limiting or a WAF.",
    evaluate: (graph) => {
      const entries = [...componentsOfType(graph, API_TYPES), ...componentsOfType(graph, EDGE_PROXY_TYPES)];
      if (entries.length === 0 || hasAnyType(graph, RATE_LIMIT_TYPES)) return [];
      return [
        {
          rule_id: "security.rate_limiter_missing",
          severity: "suggestion",
          title: "No rate limiting or WAF at the entry point",
          description: "Entry-point components exist without a rate limiter or WAF.",
          why_it_matters:
            "Without admission control, abusive traffic and credential stuffing reach the application tier.",
          recommendation: "Add rate limiting at the edge or gateway.",
          alternatives: ["WAF", "API gateway rate limits"],
          affected_entity_ids: entries.map((component) => component.id),
        },
      ];
    },
  }),
];
