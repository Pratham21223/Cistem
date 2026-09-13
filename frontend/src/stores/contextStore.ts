import { create } from "zustand";

import type { ContextDocument } from "@/types/context";
import type { ReviewFinding } from "@/types/review";

export type AnalysisStatus = "idle" | "analyzing" | "ready" | "error";

type ContextStoreState = {
  status: AnalysisStatus;
  context: ContextDocument | null;
  findings: ReviewFinding[];
  suggestions: string[];
  setStatus: (status: AnalysisStatus) => void;
  setContext: (context: ContextDocument | null) => void;
  setFindings: (findings: ReviewFinding[]) => void;
};

/** Owns derived understanding + review output. Never owns persisted project data. */
export const useContextStore = create<ContextStoreState>()((set) => ({
  status: "idle",
  context: null,
  findings: [],
  suggestions: [],
  setStatus: (status) => {
    set({ status });
  },
  setContext: (context) => {
    set({ context });
  },
  setFindings: (findings) => {
    set({ findings });
  },
}));
