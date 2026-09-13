import type { ComponentCategory } from "@/types/architecture";

/** Component library entry (`context.md` §11). Wire shape is snake_case; this is the app shape. */
export type KnowledgeComponent = {
  type: string;
  name: string;
  category: ComponentCategory;
  purpose: string[];
  characteristics: Record<string, string>;
  tradeoffs: string[];
  alternatives: string[];
  commonPatterns: string[];
  antiPatterns: string[];
};
