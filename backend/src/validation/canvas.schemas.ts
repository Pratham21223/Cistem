import { z } from "zod";

import {
  componentCategorySchema,
  confidenceSchema,
  provenanceSchema,
  relationshipTypeSchema,
} from "@/validation/architecture.schemas";

export const vectorSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
});

export const viewportSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
});

// React Flow-compatible node payload; semantic meaning stays on top-level fields.
const nodeBaseShape = {
  id: z.uuid(),
  position: vectorSchema,
  width: z.number().positive().max(20_000),
  height: z.number().positive().max(20_000),
  parent_id: z.uuid().nullable().optional(),
  selected: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()),
};

export const semanticNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("semantic"),
  label: z.string().max(200),
  component_type: z.string().min(1).max(100),
  category: componentCategorySchema,
  provenance: provenanceSchema,
  confidence: confidenceSchema.nullable(),
});

export const textNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("text"),
  text: z.string().max(10_000),
  variant: z.enum(["text", "label"]),
});

export const shapeNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("shape"),
  shape: z.enum(["rectangle", "ellipse"]),
});

export const noteNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("note"),
  text: z.string().max(10_000),
});

export const imageNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("image"),
  image_id: z.string().min(1).max(200),
  alt: z.string().max(300),
});

export const groupNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("group"),
});

export const frameNodeSchema = z.strictObject({
  ...nodeBaseShape,
  type: z.literal("frame"),
  label: z.string().max(200),
});

export const canvasNodeSchema = z.discriminatedUnion("type", [
  semanticNodeSchema,
  textNodeSchema,
  shapeNodeSchema,
  noteNodeSchema,
  imageNodeSchema,
  groupNodeSchema,
  frameNodeSchema,
]);

export const canvasEdgeSchema = z
  .strictObject({
    id: z.uuid(),
    source: z.uuid(),
    target: z.uuid(),
    source_handle: z.string().nullable().optional(),
    target_handle: z.string().nullable().optional(),
    type: relationshipTypeSchema,
    label: z.string().max(200).nullable().optional(),
    selected: z.boolean().optional(),
  })
  .refine((edge) => edge.source !== edge.target, {
    message: "An edge cannot start and end at the same node.",
    path: ["target"],
  });

export const strokePointSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  pressure: z.number().min(0).max(1).optional(),
});

export const strokeSchema = z.strictObject({
  id: z.uuid(),
  points: z.array(strokePointSchema).min(2).max(5000),
  width: z.number().positive().max(64),
  color: z.literal("stroke"),
});

export const canvasCommentSchema = z.strictObject({
  id: z.uuid(),
  target_id: z.uuid(),
  author: z.string().min(1).max(200),
  text: z.string().min(1).max(2000),
  created_at: z.iso.datetime(),
  resolved: z.boolean().optional(),
});

export const canvasDocumentSchema = z.strictObject({
  schema_version: z.literal(1),
  nodes: z.array(canvasNodeSchema).max(3000),
  edges: z.array(canvasEdgeSchema).max(6000),
  strokes: z.array(strokeSchema).max(3000),
  comments: z.array(canvasCommentSchema).max(1000),
  viewport: viewportSchema,
});
