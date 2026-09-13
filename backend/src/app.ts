import cors from "cors";
import express, { type Express } from "express";

import type { AppConfig } from "@/config/env";
import type { Logger } from "@/lib/logger";
import { errorHandler, notFoundHandler } from "@/middleware/error-handler";
import { requestLogger } from "@/middleware/logging";
import { requestId } from "@/middleware/request-id";
import { securityHeaders } from "@/middleware/security-headers";
import { createHealthRouter, type ReadinessCheck } from "@/routes/health.routes";

export type AppDependencies = {
  config: AppConfig;
  logger: Logger;
  checkDatabase: ReadinessCheck;
};

/**
 * Express app factory. Everything stateful (config, logger, database) is injected so
 * tests can build an app without a real database.
 */
export function createApp({ config, logger, checkDatabase }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(securityHeaders);
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(createHealthRouter({ logger, checkDatabase }));

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return app;
}
