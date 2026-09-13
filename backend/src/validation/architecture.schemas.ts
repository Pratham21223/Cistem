import { z } from "zod";

export const provenanceSchema = z.enum([
  "user_selected",
  "user_typed",
  "user_drawn",
  "image_detected",
  "template_generated",
  "ai_inferred",
  "ai_suggested",
]);

export const componentCategorySchema = z.enum([
  "networking",
  "compute",
  "storage",
  "messaging",
  "services",
  "observability",
  "security",
  "unknown",
]);

export const relationshipTypeSchema = z.enum([
  "request_flow",
  "data_flow",
  "event_flow",
  "replication",
  "dependency",
  "annotation",
]);

export const confidenceSchema = z.number().min(0).max(1);

export const applicationSchema = z.strictObject({
  name: z.string().min(1).max(200),
  domain: z.string().max(100).nullable(),
});

export const architectureComponentSchema = z.strictObject({
  id: z.uuid(),
  type: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  category: componentCategorySchema,
  source: provenanceSchema,
  confidence: confidenceSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const architectureConnectionSchema = z
  .strictObject({
    id: z.uuid(),
    source_entity_id: z.uuid(),
    target_entity_id: z.uuid(),
    type: relationshipTypeSchema,
    label: z.string().max(200).nullable(),
    source: provenanceSchema,
    confidence: confidenceSchema.nullable(),
  })
  .refine((connection) => connection.source_entity_id !== connection.target_entity_id, {
    message: "A connection cannot start and end at the same entity.",
    path: ["target_entity_id"],
  });

export const requirementKindSchema = z.enum([
  "scale",
  "latency",
  "realtime",
  "availability",
  "consistency",
  "security",
  "cost",
  "other",
]);

export const requirementSchema = z.strictObject({
  id: z.uuid(),
  kind: requirementKindSchema,
  value: z.unknown(),
  original_text: z.string().min(1).max(2000),
  source: provenanceSchema,
  confidence: confidenceSchema.nullable(),
});

export const assumptionStatusSchema = z.enum(["pending", "accepted", "rejected", "modified"]);

export const assumptionSchema = z.strictObject({
  id: z.uuid(),
  text: z.string().min(1).max(2000),
  status: assumptionStatusSchema,
  source: provenanceSchema,
  confidence: confidenceSchema.nullable(),
});

export const architectureGraphSchema = z.strictObject({
  application: applicationSchema.nullable(),
  components: z.array(architectureComponentSchema).max(1000),
  connections: z.array(architectureConnectionSchema).max(2000),
  requirements: z.array(requirementSchema).max(500),
  assumptions: z.array(assumptionSchema).max(500),
});
