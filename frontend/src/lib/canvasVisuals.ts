import type { ComponentCategory, Provenance, RelationshipType } from "@/types/architecture";

export const CATEGORY_ACCENT_CLASS: Record<ComponentCategory, string> = {
  networking: "text-cat-networking",
  compute: "text-cat-compute",
  storage: "text-cat-storage",
  messaging: "text-cat-messaging",
  services: "text-cat-services",
  observability: "text-cat-observability",
  security: "text-cat-security",
  unknown: "text-cat-unknown",
};

/** Pastel fill paired with each category (Excalidraw palette, ui-tokens.md §3). */
export const CATEGORY_FILL_CLASS: Record<ComponentCategory, string> = {
  networking: "bg-pastel-blue",
  compute: "bg-pastel-violet",
  storage: "bg-pastel-teal",
  messaging: "bg-pastel-orange",
  services: "bg-pastel-red",
  observability: "bg-pastel-yellow",
  security: "bg-pastel-gray",
  unknown: "bg-surface-secondary",
};

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  networking: "Networking",
  compute: "Compute",
  storage: "Storage",
  messaging: "Messaging",
  services: "Services",
  observability: "Observability",
  security: "Security",
  unknown: "Unclassified",
};

export const PROVENANCE_DOT_CLASS: Record<Provenance, string> = {
  user_selected: "bg-provenance-explicit",
  user_typed: "bg-provenance-explicit",
  user_drawn: "bg-provenance-inferred",
  image_detected: "bg-provenance-inferred",
  template_generated: "bg-provenance-inferred",
  ai_inferred: "bg-provenance-inferred",
  ai_suggested: "bg-provenance-suggested",
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  user_selected: "Explicit",
  user_typed: "Explicit",
  user_drawn: "Inferred",
  image_detected: "Inferred",
  template_generated: "Generated",
  ai_inferred: "Inferred",
  ai_suggested: "Suggested",
};

export const EDGE_STROKE_CLASS: Record<RelationshipType, string> = {
  request_flow: "stroke-edge",
  data_flow: "stroke-edge",
  event_flow: "stroke-edge-event",
  replication: "stroke-edge-replication",
  dependency: "stroke-edge",
  annotation: "stroke-text-faint",
};

export const EDGE_DASH: Record<RelationshipType, number[] | undefined> = {
  request_flow: undefined,
  data_flow: undefined,
  event_flow: [7, 5],
  replication: [3, 4],
  dependency: [2, 4],
  annotation: [2, 6],
};

export function isRelationshipType(value: string | undefined): value is RelationshipType {
  return (
    value === "request_flow" ||
    value === "data_flow" ||
    value === "event_flow" ||
    value === "replication" ||
    value === "dependency" ||
    value === "annotation"
  );
}
