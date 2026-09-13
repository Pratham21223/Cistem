import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
  }),
});

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1";
const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiRequestOptions<TSchema extends z.ZodType> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  responseSchema: TSchema;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Typed HTTP client. The API base is proxied by Vite in development; production builds
 * point `VITE_API_BASE_URL` at the deployed API. Errors are normalized into ApiError.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  {
    method = "GET",
    body,
    responseSchema,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: ApiRequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: requestSignal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("request_timeout", 504, "The request timed out. Please retry.");
    }
    throw new ApiError("network_error", 0, "The API is unreachable. Check your connection.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiError(
        parsedError.data.error.code,
        response.status,
        parsedError.data.error.message,
        parsedError.data.error.request_id,
      );
    }
    throw new ApiError(
      "unexpected_error",
      response.status,
      "The API returned an unexpected error.",
    );
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError("invalid_response", 502, "The API response did not match the contract.");
  }
  return parsed.data;
}
