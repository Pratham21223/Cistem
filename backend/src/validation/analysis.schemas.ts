import { z } from "zod";

import { architectureGraphSchema } from "@/validation/architecture.schemas";
import { contextDocumentSchema } from "@/validation/context.schemas";

export const contextRequestSchema = z.strictObject({
  architecture: architectureGraphSchema,
});

export const reviewRequestSchema = z.strictObject({
  architecture: architectureGraphSchema,
  trigger: z.enum(["manual", "auto"]).optional(),
});

export const suggestionsRequestSchema = z.strictObject({
  architecture: architectureGraphSchema,
});

export const suggestionRecordSchema = z.strictObject({
  id: z.uuid(),
  kind: z.enum([
    "add_component",
    "add_connection",
    "change_component",
    "remove_component",
    "reconsider",
  ]),
  payload: z.record(z.string(), z.unknown()),
  rationale: z.string().min(1).max(2000),
  source: z.enum([
    "user_selected",
    "user_typed",
    "user_drawn",
    "image_detected",
    "template_generated",
    "ai_inferred",
    "ai_suggested",
  ]),
  status: z.literal("proposed"),
});

export const suggestionsResponseSchema = z.strictObject({
  suggestions: z.array(suggestionRecordSchema).max(100),
});

/** Vision input is bounded server-side (`architecture.md` §9.1). */
export const importImageRequestSchema = z.strictObject({
  image_base64: z.string().min(1).max(14_000_000),
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

export const importImageResponseSchema = z.strictObject({
  draft: architectureGraphSchema,
  detected_text: z.array(z.string().max(500)).max(500),
  source: z.literal("ai"),
  model: z.string().max(200),
});

export { contextDocumentSchema };
