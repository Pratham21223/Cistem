import type { AIProvider } from "@/ai/types";
import { createMockAIProvider } from "@/ai/mock-provider";
import { createOllamaProvider } from "@/ai/ollama";
import { createOpenAiCompatibleProvider } from "@/ai/openai-compatible";
import type { AiConfig } from "@/config/env";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

/**
 * Builds the provider from configuration alone (`context.md` §64). Returns null when AI is
 * disabled, which callers treat as "deterministic path only".
 */
export function createAIProvider(config: AiConfig): AIProvider | null {
  if (config.provider === "mock") return createMockAIProvider();
  if (!config.isConfigured) return null;

  if (config.provider === "openai-compatible") {
    if (!config.baseUrl || !config.model) return null;
    return createOpenAiCompatibleProvider({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      visionModel: config.visionModel,
      timeoutMs: config.timeoutMs,
    });
  }

  if (config.provider === "ollama") {
    if (!config.model) return null;
    return createOllamaProvider({
      baseUrl: config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
      model: config.model,
      visionModel: config.visionModel,
      timeoutMs: config.timeoutMs,
    });
  }

  return null;
}
