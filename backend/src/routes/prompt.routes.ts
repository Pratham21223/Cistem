import { Router } from "express";

import type { AIProvider } from "@/ai/types";
import { parseInput } from "@/lib/validate";
import { buildSystemDesignPrompt } from "@/services/prompt-engine";
import {
  promptGenerateRequestSchema,
  promptGenerateResponseSchema,
} from "@/validation/prompt.schemas";

export function createPromptRouter({ aiProvider }: { aiProvider: AIProvider | null }): Router {
  const router = Router();

  router.post("/api/v1/prompt/generate", async (req, res, next) => {
    try {
      const { architecture } = parseInput(promptGenerateRequestSchema, req.body);

      // Deterministic prompt first; AI enhancement is optional and never allowed to break
      // the offline path (`build-plan.md` §9 task 3, §12 task 7).
      let prompt = buildSystemDesignPrompt(architecture);
      let source: "template" | "ai" = "template";
      if (aiProvider) {
        try {
          const generated = await aiProvider.generatePrompt(architecture);
          if (generated.trim().length > 0) {
            prompt = generated;
            source = "ai";
          }
        } catch {
          // Fall back to the deterministic prompt.
        }
      }

      res.status(200).json(
        promptGenerateResponseSchema.parse({
          prompt,
          source,
          generated_at: new Date().toISOString(),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
