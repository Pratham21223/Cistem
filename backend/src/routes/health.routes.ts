import { Router } from "express";

import { AppError } from "@/lib/errors";
import type { Logger } from "@/lib/logger";

/** Injected so tests and deployments can decide what "database reachable" means. */
export type ReadinessCheck = () => Promise<void>;

export type HealthRouterDependencies = {
  logger: Logger;
  checkDatabase: ReadinessCheck;
};

export function createHealthRouter({ logger, checkDatabase }: HealthRouterDependencies): Router {
  const router = Router();

  // Liveness: process is alive. Must not depend on the database.
  router.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", uptime_seconds: Math.round(process.uptime()) });
  });

  // Readiness: safe to receive traffic (database reachable).
  router.get("/readyz", async (_req, res, next) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: "ready", checks: { database: "ok" } });
    } catch (error) {
      logger.warn({ err: error }, "readiness check failed");
      next(new AppError("database_unavailable", 503, "Database is not reachable."));
    }
  });

  return router;
}
