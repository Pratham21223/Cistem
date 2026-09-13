export type Provenance =
  | "user_selected"
  | "user_typed"
  | "user_drawn"
  | "image_detected"
  | "template_generated"
  | "ai_inferred"
  | "ai_suggested";

export type ComponentCategory =
  | "networking"
  | "compute"
  | "storage"
  | "messaging"
  | "services"
  | "observability"
  | "security"
  | "unknown";

export type RelationshipType =
  "request_flow" | "data_flow" | "event_flow" | "replication" | "dependency" | "annotation";

export type ArchitectureApplication = {
  name: string;
  domain: string | null;
};

export type ArchitectureComponent = {
  id: string;
  type: string;
  label: string;
  category: ComponentCategory;
  source: Provenance;
  confidence: number | null;
  metadata: Record<string, unknown>;
};

export type ArchitectureConnection = {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationshipType;
  label: string | null;
  source: Provenance;
  confidence: number | null;
};

export type RequirementKind =
  "scale" | "latency" | "realtime" | "availability" | "consistency" | "security" | "cost" | "other";

export type Requirement = {
  id: string;
  kind: RequirementKind;
  value: unknown;
  originalText: string;
  source: Provenance;
  confidence: number | null;
};

export type AssumptionStatus = "pending" | "accepted" | "rejected" | "modified";

export type Assumption = {
  id: string;
  text: string;
  status: AssumptionStatus;
  source: Provenance;
  confidence: number | null;
};

export type ArchitectureGraph = {
  application: ArchitectureApplication | null;
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
  requirements: Requirement[];
  assumptions: Assumption[];
};

export function createEmptyGraph(): ArchitectureGraph {
  return {
    application: null,
    components: [],
    connections: [],
    requirements: [],
    assumptions: [],
  };
}
