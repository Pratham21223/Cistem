import request from "supertest";
import { describe, expect, it } from "vitest";

import { knowledgeComponentFiles } from "@/knowledge/components";
import { listKnowledgeComponents } from "@/services/knowledge.service";
import { knowledgeComponentSchema } from "@/validation/knowledge.schemas";
import { buildTestApp } from "./helpers/test-app";

describe("knowledge base data", () => {
  it("validates every component file against the metadata schema", () => {
    expect(knowledgeComponentFiles.length).toBeGreaterThanOrEqual(20);
    for (const file of knowledgeComponentFiles) {
      const result = knowledgeComponentSchema.safeParse(file);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it("uses unique component types", () => {
    const types = listKnowledgeComponents().map((component) => component.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("covers every component category", () => {
    const categories = new Set(listKnowledgeComponents().map((component) => component.category));
    for (const category of [
      "networking",
      "compute",
      "storage",
      "messaging",
      "services",
      "observability",
      "security",
    ]) {
      expect(categories.has(category as never)).toBe(true);
    }
  });

  it("keeps every purpose, tradeoff, and anti-pattern non-empty and specific", () => {
    for (const component of listKnowledgeComponents()) {
      expect(component.purpose.length).toBeGreaterThan(0);
      expect(component.tradeoffs.length).toBeGreaterThan(0);
      expect(component.anti_patterns.length).toBeGreaterThan(0);
    }
  });
});

describe("GET /api/v1/knowledge/components", () => {
  it("returns the full library", async () => {
    const app = buildTestApp();
    const response = await request(app).get("/api/v1/knowledge/components");

    expect(response.status).toBe(200);
    const body = response.body as { components: { type: string; category: string }[] };
    expect(body.components.length).toBe(listKnowledgeComponents().length);
    expect(body.components[0]).toHaveProperty("common_patterns");
    expect(body.components[0]).toHaveProperty("anti_patterns");
  });

  it("filters by category", async () => {
    const app = buildTestApp();
    const response = await request(app).get("/api/v1/knowledge/components?category=storage");

    expect(response.status).toBe(200);
    const body = response.body as { components: { category: string }[] };
    expect(body.components.length).toBeGreaterThan(0);
    expect(body.components.every((component) => component.category === "storage")).toBe(true);
  });

  it("rejects unknown categories with the validation error shape", async () => {
    const app = buildTestApp();
    const response = await request(app).get(
      "/api/v1/knowledge/components?category=made_up",
    );

    expect(response.status).toBe(422);
    const body = response.body as { error: { code: string } };
    expect(body.error.code).toBe("validation_failed");
  });

  it("rejects unknown query parameters", async () => {
    const app = buildTestApp();
    const response = await request(app).get("/api/v1/knowledge/components?limit=10");

    expect(response.status).toBe(422);
  });
});
