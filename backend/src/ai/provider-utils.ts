import type { z } from "zod";

import { ProviderError } from "@/lib/errors";
import type { ChatMessage } from "@/ai/types";

const REPAIR_INSTRUCTION =
  "Your previous response did not match the required JSON schema. Return valid JSON only.";

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

/**
 * Calls a provider, parses the JSON response against a Zod schema, and performs exactly one
 * repair retry on invalid output (`build-plan.md` §12 task 7). Never returns invalid data.
 */
export async function requestStructuredJson<TSchema extends z.ZodType>(options: {
  request: (messages: ChatMessage[]) => Promise<string>;
  schema: TSchema;
  messages: ChatMessage[];
  repairMessage?: string;
}): Promise<z.infer<TSchema>> {
  const { request, schema, messages, repairMessage } = options;

  const attempt = async (conversation: ChatMessage[]): Promise<z.infer<TSchema>> => {
    let raw: string;
    try {
      raw = await request(conversation);
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new ProviderError("AI provider timed out.", "provider_timeout", 504);
      }
      if (error instanceof ProviderError) throw error;
      throw new ProviderError("AI provider request failed.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new ProviderError("AI provider returned malformed JSON.", "invalid_provider_output", 502);
    }

    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new ProviderError("AI provider output did not match the schema.", "invalid_provider_output", 502);
    }
    return parsed.data;
  };

  try {
    return await attempt(messages);
  } catch (error) {
    if (!(error instanceof ProviderError) || error.code !== "invalid_provider_output") throw error;
  }

  const issues = repairMessage ?? "Invalid JSON shape.";
  return attempt([
    ...messages,
    { role: "assistant", content: "{\"error\":\"invalid output\"}" },
    { role: "user", content: `${REPAIR_INSTRUCTION}\n${issues}` },
  ]);
}
