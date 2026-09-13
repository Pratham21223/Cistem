import { z } from "zod";

import {
  applicationSchema,
  architectureComponentSchema,
  architectureConnectionSchema,
  assumptionSchema,
  requirementSchema,
} from "@/validation/architecture.schemas";

export const contextConcernSchema = z.strictObject({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
});

export const contextFlowSchema = z.strictObject({
  from_entity_id: z.uuid(),
  to_entity_id: z.uuid(),
  type: z.enum([
    "request_flow",
    "data_flow",
    "event_flow",
    "replication",
    "dependency",
    "annotation",
  ]),
});

/**
 * What the system currently understands (layer 3). Always derived from the
 * architecture graph — never from raw canvas coordinates.
 */
export const contextDocumentSchema = z.strictObject({
  application: applicationSchema.nullable(),
  scale: z.string().max(200).nullable(),
  requirements: z.array(requirementSchema).max(500),
  components: z.array(architectureComponentSchema).max(1000),
  connections: z.array(architectureConnectionSchema).max(2000),
  flows: z.array(contextFlowSchema).max(2000),
  concerns: z.array(contextConcernSchema).max(100),
  assumptions: z.array(assumptionSchema).max(500),
  open_questions: z.array(z.string().max(1000)).max(100),
  summary: z.string().max(8000).nullable(),
  updated_at: z.iso.datetime(),
});
