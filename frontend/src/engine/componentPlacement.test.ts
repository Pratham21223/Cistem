import { describe, expect, it } from "vitest";

import { createSemanticNode } from "@/engine/componentPlacement";
import { SEMANTIC_NODE_SIZE } from "@/lib/constants";
import type { KnowledgeComponent } from "@/types/knowledge";

const redis: KnowledgeComponent = {
  type: "redis",
  name: "Redis",
  category: "storage",
  purpose: ["caching"],
  characteristics: {},
  tradeoffs: [],
  alternatives: [],
  commonPatterns: [],
  antiPatterns: [],
};

describe("createSemanticNode", () => {
  it("creates a selected semantic node with explicit provenance", () => {
    const node = createSemanticNode(redis, { x: 10, y: 20 });

    expect(node.type).toBe("semantic");
    expect(node.componentType).toBe("redis");
    expect(node.label).toBe("Redis");
    expect(node.category).toBe("storage");
    expect(node.provenance).toBe("user_selected");
    expect(node.confidence).toBe(1);
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.width).toBe(SEMANTIC_NODE_SIZE.width);
    expect(node.height).toBe(SEMANTIC_NODE_SIZE.height);
    expect(node.selected).toBe(true);
  });
});
