import { Router } from "express";

import type { AIProvider } from "@/ai/types";
import { ProviderError } from "@/lib/errors";
import { parseInput } from "@/lib/validate";
import { buildContextDocument } from "@/services/context-engine";
import { interpretWithTemplate } from "@/services/interpret-service";
import { extractGraphRequirements } from "@/services/requirement-service";
import {
  contextRequestSchema,
  importImageRequestSchema,
  importImageResponseSchema,
} from "@/validation/analysis.schemas";
import { contextDocumentSchema } from "@/validation/context.schemas";
import {
  interpretRequestSchema,
  interpretResponseSchema,
  requirementExtractionRequestSchema,
  requirementExtractionResponseSchema,
} from "@/validation/prompt.schemas";

export function createAnalysisRouter({ aiProvider }: { aiProvider: AIProvider | null }): Router {
  const router = Router();

  router.post("/api/v1/analysis/interpret", async (req, res, next) => {
    try {
      const { prompt } = parseInput(interpretRequestSchema, req.body);

      if (aiProvider) {
        try {
          const analysis = await aiProvider.analyzeText({ text: prompt });
          res.status(200).json(
            interpretResponseSchema.parse({
              draft: analysis.draft,
              source: "ai",
              domain: analysis.draft.application?.domain ?? null,
              matched_keywords: [],
            }),
          );
          return;
        } catch {
          // Deterministic template interpretation is always available.
        }
      }

      const interpretation = interpretWithTemplate(prompt);
      res.status(200).json(
        interpretResponseSchema.parse({
          draft: interpretation.draft,
          source: "template",
          domain: interpretation.domain,
          matched_keywords: interpretation.matchedKeywords,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v1/analysis/requirements", (req, res, next) => {
    try {
      const { architecture } = parseInput(requirementExtractionRequestSchema, req.body);
      res.status(200).json(
        requirementExtractionResponseSchema.parse({
          requirements: extractGraphRequirements(architecture),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v1/analysis/context", async (req, res, next) => {
    try {
      const { architecture } = parseInput(contextRequestSchema, req.body);

      // Deterministic context is the baseline; AI may enrich it but never replaces it.
      const context = buildContextDocument(architecture);

      if (aiProvider) {
        try {
          const draft = await aiProvider.generateContext(architecture);
          context.summary = draft.summary;
          context.concerns = [...context.concerns, ...draft.concerns].slice(0, 100);
          context.open_questions = [
            ...new Set([...context.open_questions, ...draft.open_questions]),
          ].slice(0, 100);
          context.assumptions = [
            ...context.assumptions,
            ...draft.assumptions.map((assumption) => ({
              id: crypto.randomUUID(),
              text: assumption.text,
              status: "pending" as const,
              source: "ai_inferred" as const,
              confidence: assumption.confidence,
            })),
          ].slice(0, 500);
        } catch (error) {
          if (!(error instanceof ProviderError)) throw error;
        }
      }

      res.status(200).json(contextDocumentSchema.parse(context));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v1/analysis/import-image", async (req, res, next) => {
    try {
      const input = parseInput(importImageRequestSchema, req.body);

      // Manual tracing is the required fallback while vision is not configured (P8).
      if (!aiProvider || !aiProvider.supportsVision) {
        throw new ProviderError(
          "No vision model is configured. Trace the diagram manually or configure AI_VISION_MODEL.",
          "vision_not_configured",
          503,
        );
      }

      const result = await aiProvider.analyzeImage({
        imageBase64: input.image_base64,
        contentType: input.content_type,
      });
      res.status(200).json(
        importImageResponseSchema.parse({
          draft: result.draft,
          detected_text: result.detectedText,
          source: "ai",
          model: result.model,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
