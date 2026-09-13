import { z } from "zod";

import { aiContextDraftSchema, aiDraftGraphSchema, aiFindingsEnvelopeSchema } from "@/ai/schemas";
import { normalizeDraftGraph } from "@/ai/normalize";
import { requestStructuredJson } from "@/ai/provider-utils";
import type { AIProvider, ChatMessage } from "@/ai/types";
import { ProviderError } from "@/lib/errors";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

type OllamaOptions = {
  baseUrl: string;
  model: string;
  visionModel: string | null;
  timeoutMs: number;
};

const SYSTEM_PROMPT =
  "You are the architecture reasoning engine for Cistem. You only ever return JSON. " +
  "You distinguish explicit, inferred, and suggested content. Inferred entities carry confidence.";

const graphPrompt = (architecture: ArchitectureGraph): string =>
  `Architecture graph JSON:\n${JSON.stringify(architecture)}`;

const generatedPromptSchema = z.object({ prompt: z.string().min(1).max(20_000) });

function toOllamaMessages(messages: ChatMessage[]) {
  return messages.map((message) => {
    if (Array.isArray(message.content)) {
      const text = message.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      const images = message.content
        .filter((part): part is { type: "image"; dataUrl: string } => part.type === "image")
        .map((part) => part.dataUrl.replace(/^data:[^;]+;base64,/, ""));
      return { role: message.role, content: text, ...(images.length > 0 ? { images } : {}) };
    }
    return { role: message.role, content: message.content };
  });
}

/** Local open-weight models through the Ollama HTTP API (`architecture.md` §7.4). */
export function createOllamaProvider(options: OllamaOptions): AIProvider {
  async function complete(messages: ChatMessage[], vision = false): Promise<string> {
    const model = vision && options.visionModel ? options.visionModel : options.model;
    let response: Response;
    try {
      response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: toOllamaMessages(messages),
          stream: false,
          format: "json",
          options: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException) {
        throw new ProviderError("AI provider timed out.", "provider_timeout", 504);
      }
      throw new ProviderError("AI provider is unreachable.");
    }

    if (!response.ok) throw new ProviderError(`AI provider responded with ${response.status}.`);

    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new ProviderError("AI provider returned an empty response.", "invalid_provider_output", 502);
    }
    return content;
  }

  return {
    name: "ollama",
    model: options.model,
    supportsVision: options.visionModel !== null,

    async analyzeText({ text }) {
      const draft = await requestStructuredJson({
        request: (messages) => complete(messages),
        schema: aiDraftGraphSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Convert this description into a draft architecture graph. Never assume a specific database from a generic 'DB' label. Mark inferred entities with source ai_inferred and confidence.\n\n${text}`,
          },
        ],
      });
      return { draft: normalizeDraftGraph(draft), model: options.model };
    },

    async analyzeImage({ imageBase64, contentType }) {
      if (!options.visionModel) {
        throw new ProviderError("No vision model is configured.", "vision_not_configured", 503);
      }
      const draft = await requestStructuredJson({
        request: (messages) => complete(messages, true),
        schema: aiDraftGraphSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the architecture diagram from this image. Mark detections image_detected with confidence; keep uncertain labels generic.",
              },
              { type: "image", dataUrl: `data:${contentType};base64,${imageBase64}` },
            ],
          },
        ],
      });
      return { draft: normalizeDraftGraph(draft), detectedText: [], model: options.visionModel };
    },

    async generateContext(architecture) {
      return requestStructuredJson({
        request: (messages) => complete(messages),
        schema: aiContextDraftSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Summarize this architecture, list real concerns, open questions, and assumptions (with confidence). Do not invent requirements.\n\n${graphPrompt(architecture)}`,
          },
        ],
      });
    },

    async reviewArchitecture(architecture) {
      const result = await requestStructuredJson({
        request: (messages) => complete(messages),
        schema: aiFindingsEnvelopeSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Review this architecture for reasoning-heavy problems. Every finding needs severity, title, description, why_it_matters, recommendation, alternatives, affected_entity_ids, confidence. Do not recommend complexity a modest design does not need.\n\n${graphPrompt(architecture)}`,
          },
        ],
      });
      return result.findings.map((finding) => ({ ...finding, model: options.model }));
    },

    async generatePrompt(architecture) {
      const result = await requestStructuredJson({
        request: (messages) => complete(messages),
        schema: generatedPromptSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Compile this architecture into a structured system-design prompt (Requirements, Current architecture, Traffic, Data, Review for, Identify). Return JSON {"prompt": string}.\n\n${graphPrompt(architecture)}`,
          },
        ],
      });
      return result.prompt;
    },
  };
}
