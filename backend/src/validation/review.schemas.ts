import { z } from "zod";

import { confidenceSchema } from "@/validation/architecture.schemas";

/** Stored severity is always lowercase; the API/UI display labels are uppercase. */
export const findingSeveritySchema = z.enum(["info", "suggestion", "warning", "critical"]);

export const findingStatusSchema = z.enum(["open", "dismissed", "resolved"]);

export const findingSourceSchema = z.enum(["rules", "ai"]);

export const findingSchema = z.strictObject({
  id: z.uuid(),
  rule_id: z.string().max(120).nullable(),
  severity: findingSeveritySchema,
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(4000),
  why_it_matters: z.string().min(1).max(4000),
  recommendation: z.string().min(1).max(4000),
  alternatives: z.array(z.string().max(1000)).max(20),
  affected_entity_ids: z.array(z.uuid()).max(200),
  status: findingStatusSchema,
  source: findingSourceSchema,
  confidence: confidenceSchema.nullable(),
  created_at: z.iso.datetime(),
});

export const reviewRunSchema = z.strictObject({
  id: z.uuid(),
  trigger: z.enum(["manual", "auto"]),
  engine: z.enum(["rules", "rules_and_ai"]),
  status: z.enum(["completed", "partial", "failed"]),
  model: z.string().max(200).nullable(),
  summary: z.record(z.string(), z.number()),
  findings: z.array(findingSchema).max(500),
  created_at: z.iso.datetime(),
});
