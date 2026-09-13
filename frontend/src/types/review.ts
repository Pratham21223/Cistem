export type FindingSeverity = "info" | "suggestion" | "warning" | "critical";

export type FindingStatus = "open" | "dismissed" | "resolved";

export type FindingSource = "rules" | "ai";

export type ReviewFinding = {
  id: string;
  ruleId: string | null;
  severity: FindingSeverity;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  alternatives: string[];
  affectedEntityIds: string[];
  status: FindingStatus;
  source: FindingSource;
  confidence: number | null;
  createdAt: string;
};

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  info: "INFO",
  suggestion: "SUGGESTION",
  warning: "WARNING",
  critical: "CRITICAL",
};
