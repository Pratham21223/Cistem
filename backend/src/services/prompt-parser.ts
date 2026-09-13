import { listDomainTemplates } from "@/services/domain-service";
import type { RequirementKind } from "@/validation/architecture.schemas";
import type { DomainTemplate } from "@/validation/prompt.schemas";

export type ParsedRequirement = {
  kind: RequirementKind;
  value: unknown;
  original_text: string;
};

export type ParsedPrompt = {
  application: { name: string; domain: string } | null;
  requirements: ParsedRequirement[];
  domain: DomainTemplate | null;
  matchedKeywords: string[];
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function sentenceMatching(text: string, pattern: RegExp): string | null {
  for (const sentence of sentences(text)) {
    if (pattern.test(sentence)) return sentence;
  }
  const match = text.match(pattern);
  return match ? match[0].trim() : null;
}

function parseAmount(value: string, unit: string): number {
  const numeric = Number.parseFloat(value.replace(/,/g, ""));
  const multipliers: Record<string, number> = {
    k: 1_000,
    thousand: 1_000,
    m: 1_000_000,
    million: 1_000_000,
    bn: 1_000_000_000,
    billion: 1_000_000_000,
  };
  return Math.round(numeric * (multipliers[unit.toLowerCase()] ?? 1));
}

const SCALE_PATTERN = /\b(\d[\d.,]*)\s*(k|thousand|m|million|bn|billion|users|dau|mau)\b/i;
const LATENCY_PATTERN = /<\s*(\d+)\s*ms\b|\b(\d+)\s*ms\s*(latency|response|p99)\b/i;
const REALTIME_PATTERN = /\b(real[- ]?time|live|instant)\b/i;
const AVAILABILITY_PATTERN =
  /\b(multi[- ]?region|region failure|high(?:ly)? available|failover|uptime|99\.\d+)\b/i;
const CONSISTENCY_PATTERN =
  /\b(consisten(?:t|cy)|no double[- ]book|double[- ]book|transactional|lose (?:payment )?data|data loss|durable)\b/i;
const SECURITY_PATTERN =
  /\b(secure|security|auth(?:entication|orization)?|pci|gdpr|pii|encrypt|tenant isolation|payment)\b/i;
const COST_PATTERN = /\b(cost|cheap|budget|affordable|low[- ]cost|cost[- ]efficient|efficient)\b/i;

/** Deterministic requirement extraction (`context.md` §27). Works with no AI. */
export function extractRequirementsFromText(text: string): ParsedRequirement[] {
  const requirements: ParsedRequirement[] = [];

  const scaleSentence = sentenceMatching(text, SCALE_PATTERN);
  const scaleMatch = text.match(SCALE_PATTERN);
  if (scaleSentence && scaleMatch) {
    const amount = scaleMatch[1] ?? "0";
    const unit = scaleMatch[2] ?? "users";
    const normalizedUnit = /dau/i.test(unit)
      ? "dau"
      : /mau/i.test(unit)
        ? "mau"
        : /users/i.test(unit)
          ? "users"
          : /daily/i.test(scaleSentence)
            ? "dau"
            : "users";
    requirements.push({
      kind: "scale",
      value: { users: parseAmount(amount, unit), unit: normalizedUnit },
      original_text: scaleSentence,
    });
  }

  const latencySentence = sentenceMatching(text, LATENCY_PATTERN);
  const latencyMatch = text.match(LATENCY_PATTERN);
  if (latencySentence && latencyMatch) {
    requirements.push({
      kind: "latency",
      value: { ms: Number.parseInt(latencyMatch[1] ?? latencyMatch[2] ?? "0", 10) },
      original_text: latencySentence,
    });
  }

  const realtimeSentence = sentenceMatching(text, REALTIME_PATTERN);
  if (realtimeSentence) {
    requirements.push({ kind: "realtime", value: true, original_text: realtimeSentence });
  }

  const availabilitySentence = sentenceMatching(text, AVAILABILITY_PATTERN);
  if (availabilitySentence) {
    const target = availabilitySentence.match(/99\.\d+/)?.[0];
    requirements.push({
      kind: "availability",
      value: target ? { target } : { multiRegion: /region|multi/i.test(availabilitySentence) },
      original_text: availabilitySentence,
    });
  }

  const consistencySentence = sentenceMatching(text, CONSISTENCY_PATTERN);
  if (consistencySentence) {
    requirements.push({
      kind: "consistency",
      value: { model: "strong" },
      original_text: consistencySentence,
    });
  }

  const securitySentence = sentenceMatching(text, SECURITY_PATTERN);
  if (securitySentence) {
    requirements.push({ kind: "security", value: null, original_text: securitySentence });
  }

  const costSentence = sentenceMatching(text, COST_PATTERN);
  if (costSentence) {
    requirements.push({ kind: "cost", value: null, original_text: costSentence });
  }

  return requirements;
}

/** Matches the prompt against `knowledge/domains/` templates (`context.md` §26). */
export function detectDomainTemplate(text: string): {
  template: DomainTemplate | null;
  matchedKeywords: string[];
} {
  const haystack = text.toLowerCase();
  let best: { template: DomainTemplate; matched: string[] } | null = null;

  for (const template of listDomainTemplates()) {
    const matched = template.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
    if (matched.length > 0 && (best === null || matched.length > best.matched.length)) {
      best = { template, matched };
    }
  }

  return best ? { template: best.template, matchedKeywords: best.matched } : {
    template: null,
    matchedKeywords: [],
  };
}

export function parsePromptText(text: string): ParsedPrompt {
  const { template, matchedKeywords } = detectDomainTemplate(text);
  return {
    application: template ? { name: template.name, domain: template.domain } : null,
    requirements: extractRequirementsFromText(text),
    domain: template,
    matchedKeywords,
  };
}
