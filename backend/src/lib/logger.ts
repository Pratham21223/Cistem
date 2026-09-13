import { pino, type Logger } from "pino";

import type { AppConfig } from "@/config/env";

export type { Logger };

/**
 * One root logger. Request-scoped child loggers are created by the logging middleware.
 * Redaction is configured here so secrets never reach log output.
 */
export function createLogger(config: Pick<AppConfig, "logLevel" | "isDevelopment">): Logger {
  return pino({
    level: config.isDevelopment ? "debug" : config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "*.apiKey",
        "*.api_key",
        "*.token",
        "*.access_token",
        "*.refresh_token",
      ],
      censor: "[redacted]",
    },
    ...(config.isDevelopment
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss.l" },
          },
        }
      : {}),
  });
}
