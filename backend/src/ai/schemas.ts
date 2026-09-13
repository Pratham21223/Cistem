import { z } from "zod";

import {
  architectureGraphSchema,
  componentCategorySchema,
  confidenceSchema,
  provenanceSchema,
  relationshipTypeSchema,
} from "@/validation/architecture.schemas";
import { findingSeveritySchema } from "@/validation/review.schemas";

export const aiConcernSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
});

export const aiAssumptionSchema = z.object({
  text: z.string().min(1).max(1000),
  confidence: confidenceSchema,
});

export const aiContextDraftSchema = z.object({
  summary: z.string().min(1).max(8000),
  concerns: z.array(aiConcernSchema).max(50),
  open_questions: z.array(z.string().min(1).max(1000)).max(50),
  assumptions: z.array(aiAssumptionSchema).max(50),
});

export const aiFindingSchema = z.object({
  severity: findingSeveritySchema,
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(4000),
  why_it_matters: z.string().min(1).max(4000),
  recommendation: z.string().min(1).max(4000),
  alternatives: z.array(z.string().max(1000)).max(20),
  affected_entity_ids: z.array(z.string().max(100)).max(200),
  confidence: confidenceSchema,
});

export const aiFindingsEnvelopeSchema = z.object({
  findings: z.array(aiFindingSchema).max(100),
});

/**
 * Lenient draft-graph shape for model output. Fields the model tends to omit get declared
 * defaults during normalization — validation still rejects unknown shapes.
 */
export const aiDraftComponentSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  category: componentCategorySchema.optional(),
  source: provenanceSchema.optional(),
  confidence: confidenceSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const aiDraftConnectionSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  source_entity_id: z.string().min(1).max(100),
  target_entity_id: z.string().min(1).max(100),
  type: relationshipTypeSchema.optional(),
  label: z.string().max(200).nullable().optional(),
  source: provenanceSchema.optional(),
  confidence: confidenceSchema.nullable().optional(),
});

export const aiDraftRequirementSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  kind: z.enum([
    "scale",
    "latency",
    "realtime",
    "availability",
    "consistency",
    "security",
    "cost",
    "other",
  ]),
  value: z.unknown().optional(),
  original_text: z.string().min(1).max(2000),
  source: provenanceSchema.optional(),
  confidence: confidenceSchema.nullable().optional(),
});

export const aiDraftGraphSchema = z.object({
  application: z
    .object({ name: z.string().min(1).max(200), domain: z.string().max(100).nullable().optional() })
    .nullable()
    .optional(),
  components: z.array(aiDraftComponentSchema).max(200),
  connections: z.array(aiDraftConnectionSchema).max(400),
  requirements: z.array(aiDraftRequirementSchema).max(200),
  assumptions: z.array(z.unknown()).max(50).optional(),
});

export type AIContextDraft = z.infer<typeof aiContextDraftSchema>;
export type AIFinding = z.infer<typeof aiFindingSchema> & { model: string | null };

/** Validates the deterministic graph after normalization (defense in depth). */
export const normalizedDraftSchema = architectureGraphSchema;

export type AiDraftGraph = z.infer<typeof aiDraftGraphSchema>;
