import type {
  ArchitectureApplication,
  ArchitectureComponent,
  ArchitectureConnection,
  Assumption,
  Requirement,
} from "@/types/architecture";
import type { RelationshipType } from "@/types/architecture";

export type ContextConcern = {
  title: string;
  description: string;
};

export type ContextFlow = {
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
};

export type ContextDocument = {
  application: ArchitectureApplication | null;
  scale: string | null;
  requirements: Requirement[];
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
  flows: ContextFlow[];
  concerns: ContextConcern[];
  assumptions: Assumption[];
  openQuestions: string[];
  summary: string | null;
  updatedAt: string;
};
