import { describe, expect, it } from "vitest";

import { loadConfig } from "@/config/env";

describe("loadConfig", () => {
  it("fails fast when DATABASE_URL is missing", () => {
    expect(() => loadConfig({ NODE_ENV: "test" })).toThrowError(/DATABASE_URL/);
  });

  it("applies defaults for optional values", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
    });

    expect(config.port).toBe(4000);
    expect(config.logLevel).toBe("info");
    expect(config.corsOrigins).toEqual(["http://localhost:5173"]);
    expect(config.ai.isConfigured).toBe(false);
    expect(config.ai.timeoutMs).toBe(30_000);
  });

  it("parses a comma-separated CORS allow-list", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
      CORS_ORIGINS: "http://localhost:5173, https://cistem.app",
    });

    expect(config.corsOrigins).toEqual(["http://localhost:5173", "https://cistem.app"]);
  });

  it("rejects an invalid port instead of guessing", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
        PORT: "not-a-port",
      }),
    ).toThrowError(/PORT/);
  });

  it("treats blank env values as unset for optional variables", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
      AI_PROVIDER: "",
      AI_MODEL: "",
      AI_API_KEY: "",
      SUPABASE_JWT_ISSUER: "",
    });

    expect(config.ai.provider).toBeNull();
    expect(config.ai.isConfigured).toBe(false);
    expect(config.supabaseJwtIssuer).toBeNull();
  });

  it("reports AI as configured only when a real provider is set", () => {
    const configured = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
      AI_PROVIDER: "openai-compatible",
      AI_MODEL: "qwen2.5",
    });
    const mocked = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cistem:cistem@localhost:5432/cistem_test",
      AI_PROVIDER: "mock",
    });

    expect(configured.ai.isConfigured).toBe(true);
    expect(mocked.ai.isConfigured).toBe(false);
  });
});
