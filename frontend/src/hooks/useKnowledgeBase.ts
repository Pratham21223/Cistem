import { useEffect, useState } from "react";

import { loadKnowledgeComponents } from "@/services/knowledge";
import type { KnowledgeComponent } from "@/types/knowledge";

export type KnowledgeStatus = "loading" | "ready";

/** Loads the component library once per mount; the service handles caching and fallback. */
export function useKnowledgeBase(): { components: KnowledgeComponent[]; status: KnowledgeStatus } {
  const [components, setComponents] = useState<KnowledgeComponent[]>([]);
  const [status, setStatus] = useState<KnowledgeStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    void loadKnowledgeComponents()
      .then((loaded) => {
        if (cancelled) return;
        setComponents(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { components, status };
}
