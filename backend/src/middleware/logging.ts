import type { RequestHandler } from "express";
import type { Level } from "pino";

import type { Logger } from "@/lib/logger";

function levelForStatus(status: number): Level {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

/**
 * Logs one structured line per completed request: request id, method, route, status,
 * duration, and actor type. Never logs bodies or headers.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const actorType = req.header("authorization") ? "user" : "guest";

      logger[levelForStatus(res.statusCode)](
        {
          request_id: res.locals.requestId,
          method: req.method,
          route: req.originalUrl,
          status: res.statusCode,
          duration_ms: Math.round(durationMs * 10) / 10,
          actor_type: actorType,
        },
        "request completed",
      );
    });

    next();
  };
}
