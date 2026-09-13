import request from "supertest";
import { describe, expect, it } from "vitest";

import { createMockAIProvider } from "@/ai/mock-provider";
import { buildContextDocument } from "@/services/context-engine";
import { buildTestApp } from "./helpers/test-app";
import { component, connection, graph, requirement, scaleRequirement } from "./helpers/graph";

const designedGraph = graph({
  application: { name: "Food Delivery", domain: "food_delivery" },
  components: [component("api", "api_service"), component("db", "postgresql")],
  connections: [connection("e", "api", "db", "data_flow")],
  requirements: [scaleRequirement(1_000_000), requirement("realtime", "real-time tracking", true)],
});

describe("context engine (deterministic)", () => {
  it("builds the context document from the graph", () => {
    const context = buildContextDocument(designedGraph);

    expect(context.application?.name).toBe("Food Delivery");
    expect(context.scale).toContain("1,000,000");
    expect(context.flows).toHaveLength(1);
    expect(context.summary).toContain("2 components");
    expect(context.assumptions.length).toBeGreaterThan(0);
    expect(context.assumptions.every((assumption) => assumption.status === "pending")).toBe(true);
    expect(context.open_questions.some((question) => question.includes("latency"))).toBe(true);
    expect(context.open_questions.some((question) => question.includes("authenticated"))).toBe(true);
  });

  it("derives concerns from rule findings", () => {
    const context = buildContextDocument(
      graph({ components: [component("k", "kafka"), component("api", "api_service")] }),
    );
    expect(context.concerns.some((concern) => concern.title.includes("consumer"))).toBe(true);
  });
});

describe("POST /api/v1/analysis/context", () => {
  it("returns the deterministic document when AI is disabled", async () => {
    const app = buildTestApp();
    const response = await request(app).post("/api/v1/analysis/context").send({ architecture: designedGraph });

    expect(response.status).toBe(200);
    const body = response.body as {
      summary: string;
      scale: string;
      requirements: unknown[];
      assumptions: { source: string }[];
      updated_at: string;
    };
    expect(body.summary.length).toBeGreaterThan(0);
    expect(body.requirements).toHaveLength(2);
    expect(body.assumptions.every((assumption) => assumption.source === "template_generated")).toBe(true);
    expect(Number.isNaN(Date.parse(body.updated_at))).toBe(false);
  });

  it("merges AI summary and assumptions when a provider is configured", async () => {
    const app = buildTestApp(() => Promise.resolve(), createMockAIProvider());
    const response = await request(app).post("/api/v1/analysis/context").send({ architecture: designedGraph });

    expect(response.status).toBe(200);
    const body = response.body as { summary: string; assumptions: { source: string; confidence: number | null }[] };
    expect(body.summary).toContain("The design uses 2 components");
    expect(body.assumptions.some((assumption) => assumption.source === "ai_inferred")).toBe(true);
  });

  it("preserves original requirement wording", async () => {
    const app = buildTestApp();
    const response = await request(app).post("/api/v1/analysis/context").send({ architecture: designedGraph });
    const body = response.body as { requirements: { original_text: string }[] };
    expect(body.requirements.map((req) => req.original_text)).toContain("real-time tracking");
  });
});
