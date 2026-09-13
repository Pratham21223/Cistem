import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAIProvider } from "@/ai/factory";
import { createMockAIProvider } from "@/ai/mock-provider";
import { createOpenAiCompatibleProvider } from "@/ai/openai-compatible";
import type { AIProvider } from "@/ai/types";
import { ProviderError } from "@/lib/errors";
import { buildTestApp, testConfig } from "./helpers/test-app";
import { graph } from "./helpers/graph";

function completion(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function providerOptions() {
  return {
    baseUrl: "http://localhost:9999/v1",
    apiKey: null,
    model: "test-model",
    visionModel: null,
    timeoutMs: 1000,
  };
}

describe("createAIProvider (configuration alone swaps providers)", () => {
  it("returns null when AI is disabled", () => {
    expect(createAIProvider(testConfig().ai)).toBeNull();
  });

  it("returns the deterministic mock for AI_PROVIDER=mock", () => {
    const provider = createAIProvider(testConfig({ AI_PROVIDER: "mock" }).ai);
    expect(provider?.name).toBe("mock");
    expect(provider?.supportsVision).toBe(true);
  });

  it("builds an openai-compatible provider from env values", () => {
    const provider = createAIProvider(
      testConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "qwen2.5",
        AI_BASE_URL: "http://localhost:11434/v1",
      }).ai,
    );
    expect(provider?.name).toBe("openai-compatible");
    expect(provider?.model).toBe("qwen2.5");
    expect(provider?.supportsVision).toBe(false);
  });

  it("builds an ollama provider with a default base URL", () => {
    const provider = createAIProvider(
      testConfig({ AI_PROVIDER: "ollama", AI_MODEL: "llama3.1" }).ai,
    );
    expect(provider?.name).toBe("ollama");
  });
});

describe("openai-compatible provider structured output", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates and normalizes model output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        completion(
          JSON.stringify({
            components: [{ type: "api_service", label: "API" }],
            connections: [],
            requirements: [],
          }),
        ),
      ),
    );

    const provider = createOpenAiCompatibleProvider(providerOptions());
    const result = await provider.analyzeText({ text: "an API" });

    expect(result.draft.components[0]?.source).toBe("ai_inferred");
    expect(result.draft.components[0]?.confidence).toBe(0.6);
    expect(result.draft.components[0]?.category).toBe("unknown");
  });

  it("repairs invalid output exactly once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion("not json at all"))
      .mockResolvedValueOnce(completion(JSON.stringify({ components: [], connections: [], requirements: [] })));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenAiCompatibleProvider(providerOptions());
    const result = await provider.analyzeText({ text: "x" });

    expect(result.draft.components).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects after a failed repair instead of returning partial data", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(completion("{}")));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenAiCompatibleProvider(providerOptions());
    await expect(provider.analyzeText({ text: "x" })).rejects.toMatchObject({
      code: "invalid_provider_output",
      statusCode: 502,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps timeouts to provider_timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    );
    const provider = createOpenAiCompatibleProvider(providerOptions());
    await expect(provider.generatePrompt(graph())).rejects.toMatchObject({
      code: "provider_timeout",
      statusCode: 504,
    });
  });
});

describe("AI degradation behavior", () => {
  it("falls back to the deterministic template when AI analysis fails", async () => {
    const fail = (): Promise<never> => Promise.reject(new ProviderError("boom"));
    const failing: AIProvider = {
      name: "mock",
      model: "broken",
      supportsVision: false,
      analyzeText: fail,
      analyzeImage: fail,
      generateContext: fail,
      reviewArchitecture: fail,
      generatePrompt: fail,
    };
    const app = buildTestApp(() => Promise.resolve(), failing);

    const interpret = await request(app)
      .post("/api/v1/analysis/interpret")
      .send({ prompt: "Build a food delivery platform for 1M daily active users" });
    expect(interpret.status).toBe(200);
    const interpretBody = interpret.body as { source: string };
    expect(interpretBody.source).toBe("template");

    const prompt = await request(app)
      .post("/api/v1/prompt/generate")
      .send({ architecture: graph() });
    expect(prompt.status).toBe(200);
    const promptBody = prompt.body as { source: string; prompt: string };
    expect(promptBody.source).toBe("template");
    expect(promptBody.prompt).toContain("Design a scalable system.");
  });
});

describe("POST /api/v1/analysis/import-image (P8)", () => {
  it("returns 503 with the manual fallback when vision is not configured", async () => {
    const app = buildTestApp();
    const response = await request(app)
      .post("/api/v1/analysis/import-image")
      .send({ image_base64: "aGVsbG8=", content_type: "image/png" });

    expect(response.status).toBe(503);
    const body = response.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe("vision_not_configured");
    expect(body.error.message).toContain("Trace the diagram manually");
  });

  it("returns reviewable image_detected entities with the mock vision provider", async () => {
    const app = buildTestApp(() => Promise.resolve(), createMockAIProvider());
    const response = await request(app)
      .post("/api/v1/analysis/import-image")
      .send({ image_base64: "aGVsbG8=", content_type: "image/png" });

    expect(response.status).toBe(200);
    const body = response.body as {
      source: string;
      model: string;
      detected_text: string[];
      draft: { components: { source: string; confidence: number | null }[] };
    };
    expect(body.source).toBe("ai");
    expect(body.detected_text).toContain("DB");
    expect(body.draft.components.every((component) => component.source === "image_detected")).toBe(true);
    expect(body.draft.components.every((component) => (component.confidence ?? 0) > 0)).toBe(true);
  });

  it("rejects unsupported content types", async () => {
    const app = buildTestApp(() => Promise.resolve(), createMockAIProvider());
    const response = await request(app)
      .post("/api/v1/analysis/import-image")
      .send({ image_base64: "aGVsbG8=", content_type: "image/gif" });
    expect(response.status).toBe(422);
  });
});
