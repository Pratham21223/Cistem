import { describe, expect, it } from "vitest";

import {
  architectureGraphSchema,
  architectureComponentSchema,
} from "@/validation/architecture.schemas";
import { canvasDocumentSchema } from "@/validation/canvas.schemas";
import { contextDocumentSchema } from "@/validation/context.schemas";
import { findingSchema } from "@/validation/review.schemas";

const CLIENT_ID = "3f1c1d54-6a4b-4e4f-9b3b-2f0f2b6a1c01";
const API_ID = "3f1c1d54-6a4b-4e4f-9b3b-2f0f2b6a1c02";
const EDGE_ID = "3f1c1d54-6a4b-4e4f-9b3b-2f0f2b6a1c03";

describe("canvas document contract", () => {
  it("accepts a minimal valid document", () => {
    const result = canvasDocumentSchema.safeParse({
      schema_version: 1,
      nodes: [
        {
          id: CLIENT_ID,
          type: "semantic",
          position: { x: 0, y: 0 },
          width: 160,
          height: 64,
          data: {},
          label: "Client",
          component_type: "client",
          category: "unknown",
          provenance: "user_selected",
          confidence: null,
        },
        {
          id: API_ID,
          type: "text",
          position: { x: 240, y: 0 },
          width: 200,
          height: 40,
          data: {},
          text: "1M users",
          variant: "text",
        },
      ],
      edges: [
        {
          id: EDGE_ID,
          source: CLIENT_ID,
          target: API_ID,
          type: "request_flow",
        },
      ],
      strokes: [
        {
          id: "3f1c1d54-6a4b-4e4f-9b3b-2f0f2b6a1c04",
          points: [
            { x: 0, y: 0 },
            { x: 4, y: 4 },
          ],
          width: 2,
          color: "stroke",
        },
      ],
      comments: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown node type", () => {
    const result = canvasDocumentSchema.safeParse({
      schema_version: 1,
      nodes: [
        {
          id: CLIENT_ID,
          type: "mystery",
          position: { x: 0, y: 0 },
          width: 10,
          height: 10,
          data: {},
        },
      ],
      edges: [],
      strokes: [],
      comments: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a self-loop edge", () => {
    const result = canvasDocumentSchema.safeParse({
      schema_version: 1,
      nodes: [],
      edges: [
        {
          id: EDGE_ID,
          source: CLIENT_ID,
          target: CLIENT_ID,
          type: "data_flow",
        },
      ],
      strokes: [],
      comments: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(result.success).toBe(false);
  });
});

describe("architecture graph contract", () => {
  it("rejects an invalid provenance value", () => {
    const result = architectureComponentSchema.safeParse({
      id: CLIENT_ID,
      type: "client",
      label: "Client",
      category: "unknown",
      source: "user_guessed",
      confidence: null,
      metadata: {},
    });

    expect(result.success).toBe(false);
  });

  it("accepts a graph with components and connections", () => {
    const result = architectureGraphSchema.safeParse({
      application: { name: "Food Delivery", domain: "food_delivery" },
      components: [
        {
          id: CLIENT_ID,
          type: "client",
          label: "Mobile App",
          category: "compute",
          source: "user_selected",
          confidence: null,
          metadata: {},
        },
        {
          id: API_ID,
          type: "api_server",
          label: "API",
          category: "compute",
          source: "ai_inferred",
          confidence: 0.78,
          metadata: {},
        },
      ],
      connections: [
        {
          id: EDGE_ID,
          source_entity_id: CLIENT_ID,
          target_entity_id: API_ID,
          type: "request_flow",
          label: null,
          source: "ai_inferred",
          confidence: 0.78,
        },
      ],
      requirements: [
        {
          id: "3f1c1d54-6a4b-4e4f-9b3b-2f0f2b6a1c05",
          kind: "scale",
          value: { users: 1_000_000, unit: "dau" },
          original_text: "1M users",
          source: "user_typed",
          confidence: null,
        },
      ],
      assumptions: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("finding and context contracts", () => {
  it("accepts a complete finding", () => {
    const result = findingSchema.safeParse({
      id: EDGE_ID,
      rule_id: "messaging.kafka_without_consumer",
      severity: "warning",
      title: "Kafka has no visible consumer",
      description: "Kafka is present but nothing consumes from it.",
      why_it_matters: "Without a consumer the event stream is unused infrastructure.",
      recommendation: "Add a worker/consumer or remove Kafka.",
      alternatives: ["Add a consumer service", "Remove Kafka until needed"],
      affected_entity_ids: [CLIENT_ID],
      status: "open",
      source: "rules",
      confidence: null,
      created_at: "2026-09-13T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a context document with an explicit updated_at", () => {
    const result = contextDocumentSchema.safeParse({
      application: null,
      scale: "1M DAU",
      requirements: [],
      components: [],
      connections: [],
      flows: [],
      concerns: [],
      assumptions: [],
      open_questions: ["What is the expected write volume?"],
      summary: null,
      updated_at: "2026-09-13T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
