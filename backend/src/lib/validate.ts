import type { z } from "zod";

import { ValidationError } from "@/lib/errors";

/** Parses request input at the boundary and maps failures to the 422 validation error. */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(`Request validation failed — ${details}`);
  }
  return result.data;
}
