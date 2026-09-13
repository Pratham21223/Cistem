/**
 * One error taxonomy for the backend. Services throw these; the error middleware maps
 * them to the stable API response shape:
 *   { "error": { "code": string, "message": string, "request_id": string } }
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Malformed request.", code = "bad_request") {
    super(code, 400, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed.", code = "validation_failed") {
    super(code, 422, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.", code = "unauthorized") {
    super(code, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Not allowed.", code = "forbidden") {
    super(code, 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.", code = "not_found") {
    super(code, 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict.", code = "conflict") {
    super(code, 409, message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large.", code = "payload_too_large") {
    super(code, 413, message);
  }
}

export class ProviderError extends AppError {
  constructor(message = "Upstream provider failed.", code = "provider_error", statusCode = 502) {
    super(code, statusCode, message);
  }
}
