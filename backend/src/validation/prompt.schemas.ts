import { z } from "zod";

import {
  architectureGraphSchema,
  relationshipTypeSchema,
  requirementKindSchema,
  requirementSchema,
} from "@/validation/architecture.schemas";

/** Domain template files in `knowledge/domains/` (`context.md` §26). */
export const domainTemplateSchema = z.strictObject({
  domain: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  keywords: z.array(z.string().min(1).max(100)).min(1).max(20),
  requirements: z
    .array(
      z.strictObject({
        kind: requirementKindSchema,
        value: z.unknown(),
        original_text: z.string().min(1).max(1000),
      }),
    )
    .max(20),
  components: z
    .array(
      z.strictObject({
        key: z.string().min(1).max(100),
        type: z.string().min(1).max(100),
        label: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(60),
  connections: z
    .array(
      z.strictObject({
        from: z.string().min(1).max(100),
        to: z.string().min(1).max(100),
        type: relationshipTypeSchema,
      }),
    )
    .max(120),
});

export const promptGenerateRequestSchema = z.strictObject({
  architecture: architectureGraphSchema,
});

export const promptGenerateResponseSchema = z.strictObject({
  prompt: z.string().min(1).max(20_000),
  source: z.enum(["template", "ai"]),
  generated_at: z.iso.datetime(),
});

export const interpretRequestSchema = z.strictObject({
  prompt: z.string().min(1).max(4000),
});

export const interpretResponseSchema = z.strictObject({
  draft: architectureGraphSchema,
  source: z.enum(["template", "ai"]),
  domain: z.string().max(100).nullable(),
  matched_keywords: z.array(z.string().max(100)).max(20),
});

export const requirementExtractionRequestSchema = z.strictObject({
  architecture: architectureGraphSchema,
});

export const requirementExtractionResponseSchema = z.strictObject({
  requirements: z.array(requirementSchema).max(500),
});

export type DomainTemplate = z.infer<typeof domainTemplateSchema>;
