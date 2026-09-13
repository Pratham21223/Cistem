import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  AI_PROVIDER: z.enum(["openai-compatible", "ollama", "mock"]).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_VISION_MODEL: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),

  SUPABASE_JWT_ISSUER: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export type AiConfig = {
  provider: Exclude<Env["AI_PROVIDER"], undefined> | null;
  model: string | null;
  visionModel: string | null;
  baseUrl: string | null;
  apiKey: string | null;
  timeoutMs: number;
  isConfigured: boolean;
};

export type AppConfig = {
  nodeEnv: Env["NODE_ENV"];
  isDevelopment: boolean;
  isTest: boolean;
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  logLevel: Env["LOG_LEVEL"];
  ai: AiConfig;
  supabaseJwtIssuer: string | null;
};

function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Treats blank env values (`AI_MODEL=`) as unset so `.optional()` fields behave as documented. */
function normalizeEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    normalized[key] = value === "" ? undefined : value;
  }
  return normalized;
}

/**
 * Validates the process environment once at startup and fails fast with a readable
 * message. No feature code reads process.env directly; everything goes through AppConfig.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(normalizeEnv(env));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${details}`);
  }

  const parsed = result.data;
  const provider = parsed.AI_PROVIDER ?? null;

  return {
    nodeEnv: parsed.NODE_ENV,
    isDevelopment: parsed.NODE_ENV === "development",
    isTest: parsed.NODE_ENV === "test",
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS),
    logLevel: parsed.LOG_LEVEL,
    ai: {
      provider,
      model: parsed.AI_MODEL ?? null,
      visionModel: parsed.AI_VISION_MODEL ?? null,
      baseUrl: parsed.AI_BASE_URL ?? null,
      apiKey: parsed.AI_API_KEY ?? null,
      timeoutMs: parsed.AI_TIMEOUT_MS,
      isConfigured: provider !== null && provider !== "mock",
    },
    supabaseJwtIssuer: parsed.SUPABASE_JWT_ISSUER ?? null,
  };
}
