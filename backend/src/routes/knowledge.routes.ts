import { Router } from "express";

import { ValidationError } from "@/lib/errors";
import { listKnowledgeComponents } from "@/services/knowledge.service";
import { knowledgeComponentsQuerySchema } from "@/validation/knowledge.schemas";

/** Static component library. Stateless and safe for guests (`architecture.md` §4.2). */
export function createKnowledgeRouter(): Router {
  const router = Router();

  router.get("/api/v1/knowledge/components", (req, res, next) => {
    try {
      const query = knowledgeComponentsQuerySchema.safeParse(req.query);
      if (!query.success) {
        throw new ValidationError("Unknown knowledge query parameter.");
      }
      res.status(200).json({ components: listKnowledgeComponents(query.data.category) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
