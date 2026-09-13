import request from "supertest";
import { describe, expect, it } from "vitest";

import type { AIProvider } from "@/ai/types";
import { createMockAIProvider } from "@/ai/mock-provider";
import { ProviderError } from "@/lib/errors";
import { buildTestApp } from "./helpers/test-app";
import {
  component,
  connection,
  graph,
  requirement,
  scaleRequirement,
  uuidFor,
} from "./helpers/graph";

function failingProvider(error: ProviderError): AIProvider {
  const fail = (): Promise<never> => Promise.reject(error);
  return {
    name: "mock",
    model: "failing-model",
    supportsVision: false,
    analyzeText: fail,
    analyzeImage: fail,
    generateContext: fail,
    reviewArchitecture: fail,
    generatePrompt: fail,
  };
}

const kafkaOrphan = graph({
  components: [component("k", "kafka"), component("api", "api_service")],
  connections: [connection("e", "api", "k", "event_flow")],
});

describe("POST /api/v1/review", () => {
  it("returns full finding structure with stable rule IDs when AI is disabled", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/review")
      .send({ architecture: kafkaOrphan, trigger: "manual" });

    expect(response.status).toBe(200);
    const run = response.body as {
      engine: string;
      model: string | null;
      status: string;
      summary: Record<string, number>;
      findings: {
        rule_id: string | null;
        severity: string;
        title: string;
        description: string;
        why_it_matters: string;
        recommendation: string;
        alternatives: string[];
        affected_entity_ids: string[];
        source: string;
        confidence: number | null;
      }[];
    };

    expect(run.engine).toBe("rules");
    expect(run.model).toBeNull();
    expect(run.status).toBe("completed");
    const finding = run.findings.find(
      (candidate) => candidate.rule_id === "scalability.messaging_consumer_missing",
    );
    expect(finding).toBeDefined();
    expect(finding?.affected_entity_ids).toEqual([uuidFor("k")]);
    expect(finding?.title).toContain("no visible downstream consumer");
    expect(finding?.why_it_matters.length).toBeGreaterThan(0);
    expect(finding?.recommendation.length).toBeGreaterThan(0);
    expect(finding?.source).toBe("rules");
    expect(finding?.confidence).toBeNull();
    expect(run.summary.warning).toBeGreaterThanOrEqual(1);
  });

  it("merges AI findings when a provider is configured", async () => {
    const app = buildTestApp(() => Promise.resolve(), createMockAIProvider());
    const response = await request(app)
      .post("/api/v1/review")
      .send({ architecture: kafkaOrphan });

    expect(response.status).toBe(200);
    const run = response.body as {
      engine: string;
      model: string;
      findings: { source: string; rule_id: string | null; confidence: number | null }[];
    };

    expect(run.engine).toBe("rules_and_ai");
    expect(run.model).toBe("mock-architecture-v1");
    const aiFinding = run.findings.find((finding) => finding.source === "ai");
    expect(aiFinding).toBeDefined();
    expect(aiFinding?.rule_id).toBeNull();
    expect(aiFinding?.confidence).toBe(0.5);
    expect(run.findings.some((finding) => finding.source === "rules")).toBe(true);
  });

  it("degrades to a partial run on provider timeout", async () => {
    const app = buildTestApp(() => Promise.resolve(), failingProvider(new ProviderError("timeout", "provider_timeout", 504)));
    const response = await request(app).post("/api/v1/review").send({ architecture: kafkaOrphan });

    expect(response.status).toBe(200);
    const run = response.body as { status: string; engine: string };
    expect(run.status).toBe("partial");
    expect(run.engine).toBe("rules_and_ai");
  });

  it("propagates non-timeout provider failures as 502", async () => {
    const app = buildTestApp(() => Promise.resolve(), failingProvider(new ProviderError("bad output", "invalid_provider_output", 502)));
    const response = await request(app).post("/api/v1/review").send({ architecture: kafkaOrphan });

    expect(response.status).toBe(502);
    const body = response.body as { error: { code: string } };
    expect(body.error.code).toBe("invalid_provider_output");
  });
});

describe("POST /api/v1/review/suggestions", () => {
  it("proposes a worker for an unconsumed broker", async () => {
    const app = buildTestApp();
    const response = await request(app).post("/api/v1/review/suggestions").send({ architecture: kafkaOrphan });

    expect(response.status).toBe(200);
    const body = response.body as {
      suggestions: { kind: string; payload: Record<string, unknown>; rationale: string; status: string }[];
    };
    const worker = body.suggestions.find(
      (suggestion) =>
        suggestion.payload.type === "worker" &&
        suggestion.payload.connectFrom === uuidFor("k"),
    );
    expect(worker).toBeDefined();
    expect(worker?.kind).toBe("add_component");
    expect(worker?.status).toBe("proposed");
  });

  it("proposes a generic database for DB text and never a technology", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/review/suggestions")
      .send({ architecture: graph({ requirements: [requirement("other", "our DB is slow")] }) });

    const body = response.body as { suggestions: { payload: Record<string, unknown> }[] };
    const database = body.suggestions.find((suggestion) => suggestion.payload.type === "database");
    expect(database).toBeDefined();
    expect(JSON.stringify(body.suggestions)).not.toContain("postgresql");
  });

  it("keeps modest designs free of growth suggestions", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/review/suggestions")
      .send({
        architecture: graph({
          components: [component("api", "api_service"), component("db", "postgresql")],
          requirements: [scaleRequirement(10)],
        }),
      });

    const body = response.body as { suggestions: { payload: Record<string, unknown> }[] };
    expect(body.suggestions.some((suggestion) => suggestion.payload.type === "cache")).toBe(false);
  });
});
