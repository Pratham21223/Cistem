import { domainTemplateFiles } from "@/knowledge/domains";
import { domainTemplateSchema, type DomainTemplate } from "@/validation/prompt.schemas";

/** Validated once at startup: a malformed domain template must fail fast. */
const domains: DomainTemplate[] = domainTemplateFiles.map((file, index) => {
  const result = domainTemplateSchema.safeParse(file);
  if (!result.success) {
    throw new Error(
      `Domain template at index ${index} is invalid: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
});

export function listDomainTemplates(): DomainTemplate[] {
  return domains;
}

export function findDomainTemplate(domain: string): DomainTemplate | null {
  return domains.find((template) => template.domain === domain) ?? null;
}
