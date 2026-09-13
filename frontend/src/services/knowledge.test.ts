import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FALLBACK_COMPONENTS } from "@/lib/knowledgeFallback";
import {
  deleteDatabaseForTests,
  resetDatabaseConnection,
  saveKnowledgeCache,
} from "@/services/persistence";
import { getKnowledgeComponent, loadKnowledgeComponents } from "@/services/knowledge";

function apiResponse() {
  return new Response(
    JSON.stringify({
      components: [
        {
          type: "custom_cache",
          name: "Custom Cache",
          category: "storage",
          purpose: ["caching"],
          characteristics: { latency: "low" },
          tradeoffs: ["memory cost"],
          alternatives: [],
          common_patterns: ["cache-aside"],
          anti_patterns: ["cache as source of truth"],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("knowledge service", () => {
  beforeEach(async () => {
    await deleteDatabaseForTests();
    resetDatabaseConnection();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to the bundled library when the API and cache are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const components = await loadKnowledgeComponents();
    expect(components.length).toBe(FALLBACK_COMPONENTS.length);
    expect(getKnowledgeComponent("redis")?.name).toBe("Redis");
  });

  it("fetches the API, maps snake_case, and caches the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse());
    vi.stubGlobal("fetch", fetchMock);

    const components = await loadKnowledgeComponents();
    expect(components[0]).toEqual({
      type: "custom_cache",
      name: "Custom Cache",
      category: "storage",
      purpose: ["caching"],
      characteristics: { latency: "low" },
      tradeoffs: ["memory cost"],
      alternatives: [],
      commonPatterns: ["cache-aside"],
      antiPatterns: ["cache as source of truth"],
    });

    fetchMock.mockClear();
    const cached = await loadKnowledgeComponents();
    expect(cached[0]?.type).toBe("custom_cache");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses a stale cache when the API is down", async () => {
    await saveKnowledgeCache(FALLBACK_COMPONENTS.slice(0, 2));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const components = await loadKnowledgeComponents();
    expect(components).toHaveLength(2);
  });
});
