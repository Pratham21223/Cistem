import { Router } from "express";

import type { AIProvider } from "@/ai/types";
import { parseInput } from "@/lib/validate";
import { runReview } from "@/services/review-engine";
import { buildSuggestions } from "@/services/suggestion-service";
import {
  reviewRequestSchema,
  suggestionsRequestSchema,
  suggestionsResponseSchema,
} from "@/validation/analysis.schemas";
import { reviewRunSchema } from "@/validation/review.schemas";

export function createReviewRouter({ aiProvider }: { aiProvider: AIProvider | null }): Router {
  const router = Router();

  router.post("/api/v1/review", async (req, res, next) => {
    try {
      const { architecture, trigger } = parseInput(reviewRequestSchema, req.body);
      const run = await runReview({
        architecture,
        trigger: trigger ?? "manual",
        aiProvider,
      });
      res.status(200).json(reviewRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v1/review/suggestions", (req, res, next) => {
    try {
      const { architecture } = parseInput(suggestionsRequestSchema, req.body);
      res.status(200).json(
        suggestionsResponseSchema.parse({ suggestions: buildSuggestions(architecture) }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
