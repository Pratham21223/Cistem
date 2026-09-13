import { z } from "zod";

import { aiContextDraftSchema, aiDraftGraphSchema, aiFindingsEnvelopeSchema } from "@/ai/schemas";
import { normalizeDraftGraph } from "@/ai/normalize";
import { requestStructuredJson } from "@/ai/provider-utils";
import type { AIProvider, ChatMessage } from "@/ai/types";
import { ProviderError } from "@/lib/errors";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

type ProviderOptions = {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  visionModel: string | null;
  timeoutMs: number;
};

const SYSTEM_PROMPT =
  "You are the architecture reasoning engine for Cistem. You only ever return JSON. " +
  "You distinguish explicit, inferred, and suggested content. You never claim certainty " +
  "you do not have; inferred entities carry confidence between 0 and 1.";

function graphPrompt(architecture: ArchitectureGraph): string {
  return `Architecture graph JSON:\n${JSON.stringify(architecture)}`;
}

function toOpenAiMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === "text"
            ? { type: "text" as const, text: part.text }
            : { type: "image_url" as const, image_url: { url: part.dataUrl } },
        )
      : message.content,
  }));
}

const generatedPromptSchema = z.object({ prompt: z.string().min(1).max(20_000) });

export function createOpenAiCompatibleProvider(options: ProviderOptions): AIProvider {
  async function complete(messages: ChatMessage[], vision = false): Promise<string> {
    const model = vision && options.visionModel ? options.visionModel : options.model;
    let response: Response;
    try {
      response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: toOpenAiMessages(messages),
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException) {
        throw new ProviderError("AI provider timed out.", "provider_timeout", 504);
      }
      throw new ProviderError("AI provider is unreachable.");
    }

    if (!response.ok) {
      throw new ProviderError(`AI provider responded with ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new ProviderError("AI provider returned an empty response.", "invalid_provider_output", 502);
    }
    return content;
  }

  return {
    name: "openai-compatible",
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
            content:
              "Convert this system description into a draft architecture graph. " +
              "Use component types from this list where possible: api_service, worker, load_balancer, " +
              "api_gateway, cdn, postgresql, mysql, mongodb, redis, object_storage, kafka, rabbitmq, queue, " +
              "authentication, notification_service, search_service, payment_service. Never assume a " +
              "specific database from a generic 'DB' label. Mark inferred entities with source ai_inferred " +
              `and confidence.\n\n${text}`,
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
                text:
                  "Extract the architecture diagram from this image into a draft graph. Mark every " +
                  "detection with source image_detected and a confidence. Keep uncertain labels generic " +
                  "(a box labelled 'DB' is a generic database, never PostgreSQL).",
              },
              { type: "image", dataUrl: `data:${contentType};base64,${imageBase64}` },
            ],
          },
        ],
      });
      return { draft: normalizeDraftGraph(draft), detectedText: [], model: options.visionModel ?? options.model };
    },

    async generateContext(architecture) {
      return requestStructuredJson({
        request: (messages) => complete(messages),
        schema: aiContextDraftSchema,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Summarize what this architecture does, list real concerns, open questions, and the " +
              "assumptions you had to make. Do not invent requirements.\n\n" +
              graphPrompt(architecture),
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
            content:
              "Review this architecture for reasoning-heavy problems deterministic rules cannot " +
              "catch. Findings must include severity, title, description, why_it_matters, " +
              "recommendation, alternatives, affected_entity_ids, and confidence. Never recommend " +
              "complexity a modest design does not need.\n\n" +
              graphPrompt(architecture),
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
            content:
              "Compile this architecture into a structured system-design prompt with sections: " +
              "Requirements, Current architecture, Traffic, Data, Review for, Identify. " +
              "Return JSON: {\"prompt\": string}.\n\n" +
              graphPrompt(architecture),
          },
        ],
      });
      return result.prompt;
    },
  };
}
