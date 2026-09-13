import type { ArchitectureGraph } from "@/validation/architecture.schemas";
import { costRules } from "@/rules/cost";
import { performanceRules } from "@/rules/performance";
import { reliabilityRules } from "@/rules/reliability";
import { scalabilityRules } from "@/rules/scalability";
import { securityRules } from "@/rules/security";
import { simplicityRules } from "@/rules/simplicity";
import type { Rule, RuleFinding } from "@/rules/base";

/** Single source of rule IDs for the server. Client rule IDs must stay a subset. */
export const ruleRegistry: Rule[] = [
  ...scalabilityRules,
  ...reliabilityRules,
  ...performanceRules,
  ...securityRules,
  ...costRules,
  ...simplicityRules,
];

export function listRules(): Rule[] {
  return ruleRegistry;
}

export function findRule(ruleId: string): Rule | null {
  return ruleRegistry.find((rule) => rule.id === ruleId) ?? null;
}

export function runRules(graph: ArchitectureGraph): RuleFinding[] {
  return ruleRegistry.flatMap((rule) => rule.evaluate(graph));
}
