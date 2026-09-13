import {
  SUPPORTED_SCALE_THRESHOLD,
  componentsOfType,
  defineRule,
  labelOf,
  scaleOf,
  type Rule,
} from "@/rules/base";

/**
 * Cost rules enforce the simplicity guardrail (`context.md` §59): they only fire when the
 * design states a modest scale, so a "10 users" design is never told to grow infrastructure.
 */
export const costRules: Rule[] = [
  defineRule({
    id: "cost.premature_event_stream",
    dimension: "cost",
    description: "Event streaming infrastructure for a modest, explicitly small design.",
    evaluate: (graph) => {
      const scale = scaleOf(graph);
      if (scale === null || scale >= SUPPORTED_SCALE_THRESHOLD) return [];
      return componentsOfType(graph, new Set(["kafka"])).map((component) => ({
        rule_id: "cost.premature_event_stream",
        severity: "suggestion",
        title: `${labelOf(graph, component.id)} may be premature for this scale`,
        description: `The design targets ${scale.toLocaleString("en-US")} users but includes an event streaming platform.`,
        why_it_matters:
          "Distributed streaming adds operational burden and cost beyond what a small design needs.",
        recommendation: "Consider a simple queue or synchronous processing until scale requires streaming.",
        alternatives: ["Managed queue", "In-process events"],
        affected_entity_ids: [component.id],
      }));
    },
  }),

  defineRule({
    id: "cost.premature_orchestration",
    dimension: "cost",
    description: "Container orchestration for a modest, explicitly small design.",
    evaluate: (graph) => {
      const scale = scaleOf(graph);
      if (scale === null || scale >= SUPPORTED_SCALE_THRESHOLD) return [];
      return componentsOfType(graph, new Set(["kubernetes_cluster"])).map((component) => ({
        rule_id: "cost.premature_orchestration",
        severity: "suggestion",
        title: `${labelOf(graph, component.id)} may be premature for this scale`,
        description: `The design targets ${scale.toLocaleString("en-US")} users but includes a Kubernetes cluster.`,
        why_it_matters:
          "Orchestration carries a high operational floor that small systems rarely repay.",
        recommendation: "Start with a managed container platform or serverless deploy.",
        alternatives: ["Managed container platform", "Serverless functions"],
        affected_entity_ids: [component.id],
      }));
    },
  }),
];
