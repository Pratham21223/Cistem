import { describe, expect, it } from "vitest";

import { fuzzyFilter, fuzzyScore } from "@/lib/fuzzy";

describe("fuzzyScore", () => {
  it("matches subsequences in order", () => {
    expect(fuzzyScore("lb", "Load Balancer")).not.toBeNull();
    expect(fuzzyScore("balanc", "Load Balancer")).not.toBeNull();
    expect(fuzzyScore("zz", "Load Balancer")).toBeNull();
  });

  it("rejects out-of-order characters", () => {
    expect(fuzzyScore("laod", "Load Balancer")).toBeNull();
  });

  it("scores word-start matches above mid-word matches", () => {
    const wordStart = fuzzyScore("cache", "Cache Cluster");
    const midWord = fuzzyScore("ache", "Cache Cluster");
    expect(wordStart).not.toBeNull();
    expect(midWord).not.toBeNull();
    expect(wordStart ?? 0).toBeGreaterThan(midWord ?? 0);
  });
});

describe("fuzzyFilter", () => {
  const items = ["Load Balancer", "Redis", "Kafka", "API Gateway"];

  it("returns everything for an empty query", () => {
    expect(fuzzyFilter("", items, (item) => item)).toEqual(items);
  });

  it("filters and ranks by score", () => {
    expect(fuzzyFilter("ka", items, (item) => item)).toEqual(["Kafka"]);
    expect(fuzzyFilter("ga", items, (item) => item)).toEqual(["API Gateway"]);
  });

  it("respects the limit", () => {
    expect(fuzzyFilter("", items, (item) => item, 2)).toHaveLength(2);
  });
});
