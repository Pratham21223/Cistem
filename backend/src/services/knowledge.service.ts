import { knowledgeComponentFiles } from "@/knowledge/components";
import type { ComponentCategory } from "@/validation/architecture.schemas";
import {
  knowledgeComponentSchema,
  type KnowledgeComponent,
} from "@/validation/knowledge.schemas";

/**
 * Validated once at startup: a malformed knowledge file must fail fast, not at request time.
 * The library is static and small, so an in-process array is the whole cache.
 */
const components: KnowledgeComponent[] = knowledgeComponentFiles.map((file, index) => {
  const result = knowledgeComponentSchema.safeParse(file);
  if (!result.success) {
    throw new Error(
      `Knowledge component at index ${index} is invalid: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
});

export function listKnowledgeComponents(category?: ComponentCategory): KnowledgeComponent[] {
  if (!category) return components;
  return components.filter((component) => component.category === category);
}
