import { z } from "zod";

import { componentCategorySchema } from "@/validation/architecture.schemas";

/** Shape from `context.md` §11 / `architecture.md` §7.4. */
export const knowledgeComponentSchema = z.strictObject({
  type: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  category: componentCategorySchema,
  purpose: z.array(z.string().min(1).max(200)).min(1).max(20),
  characteristics: z.record(z.string(), z.string().min(1).max(200)),
  tradeoffs: z.array(z.string().min(1).max(400)).max(20),
  alternatives: z.array(z.string().min(1).max(200)).max(20),
  common_patterns: z.array(z.string().min(1).max(200)).max(20),
  anti_patterns: z.array(z.string().min(1).max(200)).max(20),
});

export const knowledgeComponentsQuerySchema = z.strictObject({
  category: componentCategorySchema.optional(),
});

export const knowledgeComponentsResponseSchema = z.strictObject({
  components: z.array(knowledgeComponentSchema),
});

export type KnowledgeComponent = z.infer<typeof knowledgeComponentSchema>;
