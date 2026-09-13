import cors from "cors";
import express, { type Express } from "express";

import type { AIProvider } from "@/ai/types";
import type { AppConfig } from "@/config/env";
import type { Logger } from "@/lib/logger";
import { errorHandler, notFoundHandler } from "@/middleware/error-handler";
import { requestLogger } from "@/middleware/logging";
import { requestId } from "@/middleware/request-id";
import { securityHeaders } from "@/middleware/security-headers";
import { createAnalysisRouter } from "@/routes/analysis.routes";
import { createHealthRouter, type ReadinessCheck } from "@/routes/health.routes";
import { createKnowledgeRouter } from "@/routes/knowledge.routes";
import { createPromptRouter } from "@/routes/prompt.routes";
import { createReviewRouter } from "@/routes/review.routes";

export type AppDependencies = {
  config: AppConfig;
  logger: Logger;
  checkDatabase: ReadinessCheck;
  /** null when AI is disabled — every deterministic path must still work (`context.md` §66). */
  aiProvider: AIProvider | null;
};

/**
 * Express app factory. Everything stateful (config, logger, database) is injected so
 * tests can build an app without a real database.
 */
export function createApp({
  config,
  logger,
  checkDatabase,
  aiProvider,
}: AppDependencies): Express {
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
  app.use(createKnowledgeRouter());
  app.use(createPromptRouter({ aiProvider }));
  app.use(createAnalysisRouter({ aiProvider }));
  app.use(createReviewRouter({ aiProvider }));

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return app;
}
