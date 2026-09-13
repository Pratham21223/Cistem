import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Logger } from "@/lib/logger";

export function notFoundHandler(): RequestHandler {
  return (_req, _res, next) => {
    next(new NotFoundError("Route not found.", "route_not_found"));
  };
}

function requestIdOf(res: Parameters<ErrorRequestHandler>[2]): string | undefined {
  const value: unknown = res.locals.requestId;
  return typeof value === "string" ? value : undefined;
}

/**
 * The single error middleware. Maps the domain error taxonomy to the stable response
 * shape and never exposes stack traces, SQL, or provider details to clients.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    const requestId = requestIdOf(res);

    if (error instanceof ZodError) {
      const validationError = new ValidationError();
      logger.warn({ err: error, request_id: requestId }, "request validation failed");
      res.status(validationError.statusCode).json({
        error: {
          code: validationError.code,
          message: validationError.message,
          request_id: requestId,
        },
      });
      return;
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error({ err: error, request_id: requestId }, "request failed");
      }
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, request_id: requestId },
      });
      return;
    }

    logger.error({ err: error, request_id: requestId }, "unexpected error");
    res.status(500).json({
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
        request_id: requestId,
      },
    });
  };
}
