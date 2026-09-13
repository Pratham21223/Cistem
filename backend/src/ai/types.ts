import type { ArchitectureGraph } from "@/validation/architecture.schemas";
import type { AIFinding, AIContextDraft } from "@/ai/schemas";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image"; dataUrl: string };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export type TextAnalysisInput = {
  text: string;
  architecture?: ArchitectureGraph;
};

export type TextAnalysisResult = {
  draft: ArchitectureGraph;
  model: string;
};

export type ImageAnalysisInput = {
  imageBase64: string;
  contentType: string;
};

export type ImageAnalysisResult = {
  draft: ArchitectureGraph;
  detectedText: string[];
  model: string;
};

/**
 * The provider protocol from `architecture.md` §7.1. Implementations must never touch
 * canvas state, never persist, and must validate their own output against the schemas
 * in `ai/schemas.ts` before returning.
 */
export interface AIProvider {
  readonly name: "openai-compatible" | "ollama" | "mock";
  readonly model: string;
  readonly supportsVision: boolean;
  analyzeText(input: TextAnalysisInput): Promise<TextAnalysisResult>;
  analyzeImage(input: ImageAnalysisInput): Promise<ImageAnalysisResult>;
  generateContext(architecture: ArchitectureGraph): Promise<AIContextDraft>;
  reviewArchitecture(architecture: ArchitectureGraph): Promise<AIFinding[]>;
  generatePrompt(architecture: ArchitectureGraph): Promise<string>;
}
