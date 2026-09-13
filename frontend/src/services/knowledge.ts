import { z } from "zod";

import { FALLBACK_COMPONENTS } from "@/lib/knowledgeFallback";
import { apiRequest } from "@/services/api";
import { loadKnowledgeCache, saveKnowledgeCache } from "@/services/persistence";
import type { KnowledgeComponent } from "@/types/knowledge";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const componentWireSchema = z.strictObject({
  type: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "networking",
    "compute",
    "storage",
    "messaging",
    "services",
    "observability",
    "security",
    "unknown",
  ]),
  purpose: z.array(z.string()),
  characteristics: z.record(z.string(), z.string()),
  tradeoffs: z.array(z.string()),
  alternatives: z.array(z.string()),
  common_patterns: z.array(z.string()),
  anti_patterns: z.array(z.string()),
});

const componentsResponseSchema = z.strictObject({
  components: z.array(componentWireSchema),
});

type ComponentWire = z.infer<typeof componentWireSchema>;

function fromWire(wire: ComponentWire): KnowledgeComponent {
  return {
    type: wire.type,
    name: wire.name,
    category: wire.category,
    purpose: wire.purpose,
    characteristics: wire.characteristics,
    tradeoffs: wire.tradeoffs,
    alternatives: wire.alternatives,
    commonPatterns: wire.common_patterns,
    antiPatterns: wire.anti_patterns,
  };
}

/** Sync index so canvas placement can resolve a component type without awaiting the API. */
const componentIndex = new Map<string, KnowledgeComponent>();

function indexComponents(components: KnowledgeComponent[]): void {
  for (const component of components) {
    componentIndex.set(component.type, component);
  }
}

indexComponents(FALLBACK_COMPONENTS);

export function getKnowledgeComponent(type: string): KnowledgeComponent | null {
  return componentIndex.get(type) ?? null;
}

export function listIndexedComponents(): KnowledgeComponent[] {
  return [...componentIndex.values()];
}

/**
 * Library load order: fresh cache → API (refreshes the cache) → stale cache → bundled fallback.
 * Never throws: the palette must render offline (`context.md` §43).
 */
export async function loadKnowledgeComponents(options?: {
  forceRefresh?: boolean;
}): Promise<KnowledgeComponent[]> {
  const cached = await loadKnowledgeCache().catch(() => null);
  if (cached) indexComponents(cached.components);

  const cacheIsFresh = cached !== null && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS;
  if (cacheIsFresh && options?.forceRefresh !== true && cached) {
    return cached.components;
  }

  try {
    const response = await apiRequest("/knowledge/components", {
      responseSchema: componentsResponseSchema,
    });
    const components = response.components.map(fromWire);
    indexComponents(components);
    await saveKnowledgeCache(components).catch(() => undefined);
    return components;
  } catch {
    if (cached) return cached.components;
    return FALLBACK_COMPONENTS;
  }
}
