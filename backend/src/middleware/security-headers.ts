import type { RequestHandler } from "express";

/**
 * Security headers appropriate for a JSON API. CORS is a browser policy only and is
 * never treated as authentication (backend_constraints.md §6).
 */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
};
