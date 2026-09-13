import { extractRequirementsFromText } from "@/services/prompt-parser";
import type {
  ArchitectureGraph,
  ComponentCategory,
  Requirement,
} from "@/validation/architecture.schemas";

/**
 * Re-parses stored requirement text into normalized kinds/values while preserving the
 * user's original wording (`context.md` §27). Unparsed text stays `other`.
 */
export function extractGraphRequirements(graph: ArchitectureGraph): Requirement[] {
  return graph.requirements.map((requirement) => {
    const parsed = extractRequirementsFromText(requirement.original_text)[0];
    if (!parsed) return requirement;
    return { ...requirement, kind: parsed.kind, value: parsed.value };
  });
}

export type HeuristicCandidate = {
  type: string;
  label: string;
  category: ComponentCategory;
  confidence: number;
  rationale: string;
  sourceText: string;
};

const HEURISTIC_PATTERNS: {
  pattern: RegExp;
  type: string;
  label: string;
  category: ComponentCategory;
}[] = [
  { pattern: /\b(db|database|datastore)\b/i, type: "database", label: "Database", category: "unknown" },
  { pattern: /\bcache\b/i, type: "cache", label: "Cache", category: "storage" },
  { pattern: /\bqueue\b/i, type: "queue", label: "Queue", category: "messaging" },
  { pattern: /\bkafka\b/i, type: "kafka", label: "Kafka", category: "messaging" },
  { pattern: /\bload balancer\b|\blb\b/i, type: "load_balancer", label: "Load Balancer", category: "networking" },
  { pattern: /\bcdn\b/i, type: "cdn", label: "CDN", category: "networking" },
  { pattern: /\bapi\b/i, type: "api_service", label: "API Service", category: "compute" },
  { pattern: /\bauth|login|sign[- ]?in\b/i, type: "authentication", label: "Authentication", category: "services" },
  { pattern: /\bworker|cron|scheduler|background job\b/i, type: "worker", label: "Worker", category: "compute" },
];

/**
 * Heuristic keyword detection for text that names components (`context.md` §14).
 * Candidates are suggestions only — a generic "DB" never becomes a specific technology.
 */
export function detectComponentCandidates(texts: string[]): HeuristicCandidate[] {
  const candidates = new Map<string, HeuristicCandidate>();
  for (const text of texts) {
    for (const entry of HEURISTIC_PATTERNS) {
      if (!entry.pattern.test(text)) continue;
      candidates.set(entry.type, {
        type: entry.type,
        label: entry.label,
        category: entry.category,
        confidence: 0.5,
        rationale: `Text “${text.trim()}” looks like a ${entry.label.toLowerCase()}.`,
        sourceText: text.trim(),
      });
    }
  }
  return [...candidates.values()];
}
