import type { AIProvider } from "@/ai/types";
import { ProviderError } from "@/lib/errors";
import { runRules } from "@/rules/registry";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";
import type { findingSchema } from "@/validation/review.schemas";
import type { z } from "zod";

type Finding = z.infer<typeof findingSchema>;

export type ReviewRun = {
  id: string;
  trigger: "manual" | "auto";
  engine: "rules" | "rules_and_ai";
  status: "completed" | "partial" | "failed";
  model: string | null;
  summary: Record<string, number>;
  findings: Finding[];
  created_at: string;
};

const SEVERITIES = ["critical", "warning", "suggestion", "info"] as const;

/**
 * Rules always run; AI augments when configured. A provider timeout degrades to a partial
 * run with rules only; any other provider failure propagates as a clean 502 (`architecture.md` §7.7).
 */
export async function runReview(options: {
  architecture: ArchitectureGraph;
  trigger: "manual" | "auto";
  aiProvider: AIProvider | null;
}): Promise<ReviewRun> {
  const { architecture, trigger, aiProvider } = options;
  const createdAt = new Date().toISOString();
  const now = (): string => createdAt;

  const ruleFindings: Finding[] = runRules(architecture).map((finding) => ({
    id: crypto.randomUUID(),
    rule_id: finding.rule_id,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    why_it_matters: finding.why_it_matters,
    recommendation: finding.recommendation,
    alternatives: finding.alternatives,
    affected_entity_ids: finding.affected_entity_ids,
    status: "open" as const,
    source: "rules" as const,
    confidence: null,
    created_at: now(),
  }));

  let aiFindings: Finding[] = [];
  let status: ReviewRun["status"] = "completed";
  let model: string | null = null;

  if (aiProvider) {
    model = aiProvider.model;
    try {
      const findings = await aiProvider.reviewArchitecture(architecture);
      aiFindings = findings.map((finding) => ({
        id: crypto.randomUUID(),
        rule_id: null,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        why_it_matters: finding.why_it_matters,
        recommendation: finding.recommendation,
        alternatives: finding.alternatives,
        affected_entity_ids: finding.affected_entity_ids.filter((id) =>
          architecture.components.some((component) => component.id === id),
        ),
        status: "open" as const,
        source: "ai" as const,
        confidence: finding.confidence,
        created_at: now(),
      }));
    } catch (error) {
      if (error instanceof ProviderError && error.statusCode === 504) {
        status = "partial";
      } else {
        throw error;
      }
    }
  }

  const findings = [...ruleFindings, ...aiFindings];
  const summary: Record<string, number> = {};
  for (const severity of SEVERITIES) {
    summary[severity] = findings.filter((finding) => finding.severity === severity).length;
  }

  return {
    id: crypto.randomUUID(),
    trigger,
    engine: aiProvider ? "rules_and_ai" : "rules",
    status,
    model,
    summary,
    findings,
    created_at: createdAt,
  };
}
