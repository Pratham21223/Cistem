import { listKnowledgeComponents } from "@/services/knowledge.service";
import { parsePromptText } from "@/services/prompt-parser";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

export type TemplateInterpretation = {
  draft: ArchitectureGraph;
  domain: string | null;
  matchedKeywords: string[];
};

/**
 * Deterministic prompt → draft graph (`build-plan.md` §9 task 4). Templates propose a
 * starting point with `template_generated` provenance; nothing is auto-applied.
 */
export function interpretWithTemplate(prompt: string): TemplateInterpretation {
  const parsed = parsePromptText(prompt);
  const categoryByType = new Map(
    listKnowledgeComponents().map((component) => [component.type, component.category]),
  );

  const idByKey = new Map<string, string>();
  const components = (parsed.domain?.components ?? []).map((component) => {
    const id = crypto.randomUUID();
    idByKey.set(component.key, id);
    return {
      id,
      type: component.type,
      label: component.label,
      category: categoryByType.get(component.type) ?? ("unknown" as const),
      source: "template_generated" as const,
      confidence: null,
      metadata: { domain: parsed.domain?.domain ?? null },
    };
  });

  const connections = (parsed.domain?.connections ?? []).flatMap((connection) => {
    const sourceId = idByKey.get(connection.from);
    const targetId = idByKey.get(connection.to);
    if (!sourceId || !targetId || sourceId === targetId) return [];
    return [
      {
        id: crypto.randomUUID(),
        source_entity_id: sourceId,
        target_entity_id: targetId,
        type: connection.type,
        label: null,
        source: "template_generated" as const,
        confidence: null,
      },
    ];
  });

  const parsedKinds = new Set(parsed.requirements.map((requirement) => requirement.kind));
  const requirements = [
    ...parsed.requirements.map((requirement) => ({
      id: crypto.randomUUID(),
      kind: requirement.kind,
      value: requirement.value,
      original_text: requirement.original_text,
      source: "user_typed" as const,
      confidence: null,
    })),
    ...(parsed.domain?.requirements ?? [])
      .filter((requirement) => !parsedKinds.has(requirement.kind))
      .map((requirement) => ({
        id: crypto.randomUUID(),
        kind: requirement.kind,
        value: requirement.value,
        original_text: requirement.original_text,
        source: "template_generated" as const,
        confidence: null,
      })),
  ];

  return {
    draft: {
      application: parsed.application,
      components,
      connections,
      requirements,
      assumptions: [],
    },
    domain: parsed.domain?.domain ?? null,
    matchedKeywords: parsed.matchedKeywords,
  };
}
