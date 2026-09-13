import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildSystemDesignPrompt } from "@/services/prompt-engine";
import { extractRequirementsFromText, parsePromptText } from "@/services/prompt-parser";
import { buildTestApp } from "./helpers/test-app";
import { component, connection, graph, requirement, scaleRequirement } from "./helpers/graph";

describe("prompt parser (deterministic, no AI)", () => {
  it("extracts scale, latency, realtime, availability, consistency, security, and cost", () => {
    const text =
      "Build a food delivery platform for 1M daily active users. " +
      "Search must respond in <200ms. Real-time driver tracking is required. " +
      "It must survive region failure. The ledger must be strongly consistent. " +
      "Payments must be secure. Keep infrastructure cost efficient.";

    const kinds = extractRequirementsFromText(text).map((parsed) => parsed.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "scale",
        "latency",
        "realtime",
        "availability",
        "consistency",
        "security",
        "cost",
      ]),
    );
  });

  it("normalizes the scale value and preserves the original sentence", () => {
    const [scale] = extractRequirementsFromText("Handle 10M users without breaking.");
    expect(scale?.kind).toBe("scale");
    expect(scale?.value).toEqual({ users: 10_000_000, unit: "users" });
    expect(scale?.original_text).toContain("10M users");
  });

  it("detects a matching domain template from keywords", () => {
    const parsed = parsePromptText("Build a food delivery platform for 1M daily active users");
    expect(parsed.domain?.domain).toBe("food_delivery");
    expect(parsed.matchedKeywords.length).toBeGreaterThan(0);
    expect(parsed.application?.name).toBe("Food Delivery");
  });

  it("returns no domain for unrelated prompts", () => {
    const parsed = parsePromptText("Build something for my personal blog");
    expect(parsed.domain).toBeNull();
  });
});

describe("prompt engine", () => {
  it("builds the context.md §20 structure", () => {
    const prompt = buildSystemDesignPrompt(
      graph({
        application: { name: "Food Delivery", domain: "food_delivery" },
        components: [component("api", "api_service", { label: "API" }), component("db", "postgresql", { label: "PostgreSQL" })],
        connections: [connection("e1", "api", "db", "data_flow")],
        requirements: [scaleRequirement(1_000_000)],
      }),
    );

    expect(prompt).toContain("Design a scalable Food Delivery.");
    expect(prompt).toContain("Requirements:");
    expect(prompt).toContain("Current architecture:");
    expect(prompt).toContain("API → PostgreSQL");
    expect(prompt).toContain("Review for:");
    expect(prompt).toContain("- scalability");
    expect(prompt).toContain("Identify:");
  });

  it("still produces a prompt for an empty graph", () => {
    const prompt = buildSystemDesignPrompt(graph());
    expect(prompt).toContain("Design a scalable system.");
    expect(prompt).toContain("No components defined yet.");
  });
});

describe("POST /api/v1/prompt/generate", () => {
  it("returns a deterministic prompt when AI is disabled", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/prompt/generate")
      .send({
        architecture: graph({
          application: { name: "Food Delivery", domain: "food_delivery" },
          components: [component("api", "api_service", { label: "API" })],
          requirements: [requirement("realtime", "real-time tracking", true)],
        }),
      });

    expect(response.status).toBe(200);
    const body = response.body as { prompt: string; source: string };
    expect(body.source).toBe("template");
    expect(body.prompt).toContain("Design a scalable Food Delivery.");
    expect(body.prompt).toContain("real-time tracking");
  });

  it("rejects invalid payloads with 422", async () => {
    const app = buildTestApp();
    const response = await request(app).post("/api/v1/prompt/generate").send({ nope: true });
    expect(response.status).toBe(422);
  });
});

describe("POST /api/v1/analysis/interpret (no AI)", () => {
  it("generates an editable template draft with provenance", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/analysis/interpret")
      .send({ prompt: "Build a scalable food delivery platform for 1M daily active users" });

    expect(response.status).toBe(200);
    const body = response.body as {
      source: string;
      domain: string;
      draft: {
        components: { type: string; source: string }[];
        connections: unknown[];
        requirements: { kind: string; original_text: string; source: string }[];
      };
    };

    expect(body.source).toBe("template");
    expect(body.domain).toBe("food_delivery");
    expect(body.draft.components.length).toBeGreaterThan(5);
    expect(body.draft.connections.length).toBeGreaterThan(5);
    expect(body.draft.components.every((component) => component.source === "template_generated")).toBe(true);

    const scale = body.draft.requirements.find((req) => req.kind === "scale");
    expect(scale?.original_text).toContain("1M daily active users");
    expect(scale?.source).toBe("user_typed");
  });

  it("returns only parsed requirements when no domain matches", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/analysis/interpret")
      .send({ prompt: "A tiny internal tool for 10 users" });

    expect(response.status).toBe(200);
    const body = response.body as { draft: { components: unknown[] } };
    expect(body.draft.components).toHaveLength(0);
  });
});

describe("POST /api/v1/analysis/requirements", () => {
  it("upgrades stored text to normalized requirements without losing wording", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/analysis/requirements")
      .send({ architecture: graph({ requirements: [requirement("other", "handle 10M users")] }) });

    expect(response.status).toBe(200);
    const body = response.body as { requirements: { kind: string; original_text: string; value: unknown }[] };
    expect(body.requirements[0]?.kind).toBe("scale");
    expect(body.requirements[0]?.original_text).toBe("handle 10M users");
    expect(body.requirements[0]?.value).toEqual({ users: 10_000_000, unit: "users" });
  });
});
