import type { AIProvider } from "@/ai/types";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

const now = (): string => new Date().toISOString();

function summarySentence(architecture: ArchitectureGraph): string {
  const count = architecture.components.length;
  const flows = architecture.connections.length;
  if (count === 0) return "The architecture is not defined yet; only free text is present.";
  return `The design uses ${count} component${count === 1 ? "" : "s"} and ${flows} connection${
    flows === 1 ? "" : "s"
  }.`;
}

/**
 * Deterministic provider used by tests and local development without credentials
 * (`AI_PROVIDER=mock`). It is not a real model and never makes network calls.
 */
export function createMockAIProvider(): AIProvider {
  return {
    name: "mock",
    model: "mock-architecture-v1",
    supportsVision: true,

    analyzeText: ({ text }) => {
      const components = text.toLowerCase().includes("db")
        ? [
            {
              id: crypto.randomUUID(),
              type: "database",
              label: "Database",
              category: "unknown" as const,
              source: "ai_inferred" as const,
              confidence: 0.5,
              metadata: {},
            },
          ]
        : [];
      return Promise.resolve({
        draft: {
          application: null,
          components,
          connections: [],
          requirements: [],
          assumptions: [],
        },
        model: "mock-architecture-v1",
      });
    },

    analyzeImage: () => {
      const client = crypto.randomUUID();
      const api = crypto.randomUUID();
      const database = crypto.randomUUID();
      return Promise.resolve({
        draft: {
          application: null,
          components: [
            {
              id: client,
              type: "api_service",
              label: "Client",
              category: "compute" as const,
              source: "image_detected" as const,
              confidence: 0.7,
              metadata: {},
            },
            {
              id: api,
              type: "api_service",
              label: "API",
              category: "compute" as const,
              source: "image_detected" as const,
              confidence: 0.7,
              metadata: {},
            },
            {
              id: database,
              type: "database",
              label: "DB",
              category: "unknown" as const,
              source: "image_detected" as const,
              confidence: 0.5,
              metadata: {},
            },
          ],
          connections: [
            {
              id: crypto.randomUUID(),
              source_entity_id: client,
              target_entity_id: api,
              type: "request_flow" as const,
              label: null,
              source: "image_detected" as const,
              confidence: 0.6,
            },
            {
              id: crypto.randomUUID(),
              source_entity_id: api,
              target_entity_id: database,
              type: "data_flow" as const,
              label: null,
              source: "image_detected" as const,
              confidence: 0.6,
            },
          ],
          requirements: [],
          assumptions: [],
        },
        detectedText: ["Client", "API", "DB"],
        model: "mock-architecture-v1",
      });
    },

    generateContext: (architecture) =>
      Promise.resolve({
        summary: summarySentence(architecture),
        concerns: [],
        open_questions:
          architecture.requirements.length === 0
            ? ["What scale is this system expected to handle?"]
            : [],
        assumptions: [
          { text: "Scale figures refer to the stated unit.", confidence: 0.6 },
        ],
      }),

    reviewArchitecture: (architecture) => {
      if (architecture.components.length === 0) return Promise.resolve([]);
      return Promise.resolve([
        {
          severity: "info" as const,
          title: "Mock AI review",
          description: "The mock provider returns a deterministic interpretation finding.",
          why_it_matters: "It keeps the AI review path testable while credentials are blocked.",
          recommendation: "Configure a real AI provider to receive architecture reasoning.",
          alternatives: [],
          affected_entity_ids: architecture.components.slice(0, 1).map((component) => component.id),
          confidence: 0.5,
          model: "mock-architecture-v1",
        },
      ]);
    },

    generatePrompt: (architecture) =>
      Promise.resolve(
        `Design ${architecture.application?.name ?? "this system"} (mock AI prompt, ${now()}).`,
      ),
  };
}
