import { createApp } from "@/app";
import type { AIProvider } from "@/ai/types";
import { loadConfig, type AppConfig } from "@/config/env";
import { pino } from "pino";

export const TEST_DATABASE_URL = "postgresql://cistem:cistem@localhost:5432/cistem_test";

export function testConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    LOG_LEVEL: "error",
    ...overrides,
  });
}

export function buildTestApp(
  checkDatabase: () => Promise<void> = () => Promise.resolve(),
  aiProvider: AIProvider | null = null,
) {
  const config = testConfig();
  const logger = pino({ level: "silent" });
  return createApp({ config, logger, checkDatabase, aiProvider });
}
