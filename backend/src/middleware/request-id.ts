import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Accepts an inbound correlation id (bounded length) or generates one, exposes it to
 * handlers via res.locals.requestId, and echoes it back in the response header.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.header(REQUEST_ID_HEADER);
  const id = inbound && inbound.length <= 128 ? inbound : randomUUID();

  res.locals.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
