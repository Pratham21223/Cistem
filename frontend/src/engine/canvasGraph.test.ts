import { describe, expect, it } from "vitest";

import {
  clamp,
  collectDescendantIds,
  createCanvasNodeChangeReducer,
  findStrokesNearPoint,
  getAbsolutePosition,
  getNodesBounds,
  normalizeRect,
  sortNodesParentsFirst,
  strokePath,
} from "@/engine/canvasGraph";
import type {
  CanvasNode,
  GroupNode,
  SemanticNode,
  ShapeNode,
  Stroke,
  TextNode,
} from "@/types/canvas";

function semantic(id: string, x = 0, y = 0, parentId?: string): SemanticNode {
  return {
    id,
    type: "semantic",
    position: { x, y },
    width: 160,
    height: 64,
    parentId,
    data: {},
    label: id,
    componentType: "api_server",
    category: "compute",
    provenance: "user_selected",
    confidence: null,
  };
}

function shape(id: string, x = 0, y = 0, parentId?: string): ShapeNode {
  return {
    id,
    type: "shape",
    position: { x, y },
    width: 100,
    height: 50,
    parentId,
    data: {},
    shape: "rectangle",
  };
}

function text(id: string, x = 0, y = 0): TextNode {
  return {
    id,
    type: "text",
    position: { x, y },
    width: 100,
    height: 30,
    data: {},
    text: id,
    variant: "text",
  };
}

function group(id: string, x = 0, y = 0, width = 400, height = 300): GroupNode {
  return {
    id,
    type: "group",
    position: { x, y },
    width,
    height,
    data: {},
  };
}

describe("geometry helpers", () => {
  it("clamp keeps values in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("normalizeRect handles any drag direction", () => {
    expect(normalizeRect({ x: 100, y: 80 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      width: 80,
      height: 70,
    });
  });
});

describe("node hierarchy helpers", () => {
  const child = semantic("child", 10, 10, "parent");
  const grandchild = text("grandchild", 5, 5);
  grandchild.parentId = "child";
  const parent = group("parent");
  const outsider = semantic("outsider", 500, 500);

  it("collectDescendantIds returns nested children", () => {
    const ids = collectDescendantIds([parent, child, grandchild, outsider], ["parent"]);
    expect([...ids].sort()).toEqual(["child", "grandchild", "parent"]);
  });

  it("sortNodesParentsFirst puts parents before children", () => {
    const sorted = sortNodesParentsFirst([grandchild, child, parent]);
    expect(sorted.map((node) => node.id)).toEqual(["parent", "child", "grandchild"]);
  });

  it("getAbsolutePosition sums parent offsets", () => {
    const byId = new Map<string, CanvasNode>([
      [parent.id, parent],
      [child.id, child],
      [grandchild.id, grandchild],
    ]);
    expect(getAbsolutePosition(grandchild, byId)).toEqual({ x: 15, y: 15 });
  });

  it("getNodesBounds uses absolute positions", () => {
    const bounds = getNodesBounds([parent, child]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });
});

describe("stroke helpers", () => {
  const stroke: Stroke = {
    id: "stroke-1",
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    width: 2,
    color: "stroke",
  };

  it("findStrokesNearPoint hits segments within the threshold", () => {
    expect(findStrokesNearPoint([stroke], { x: 50, y: 4 }, 8)).toEqual(["stroke-1"]);
    expect(findStrokesNearPoint([stroke], { x: 50, y: 40 }, 8)).toEqual([]);
  });

  it("strokePath produces a path for one and many points", () => {
    expect(strokePath([])).toBe("");
    expect(strokePath([{ x: 1, y: 2 }])).toContain("M 1 2");
    expect(strokePath(stroke.points)).toContain("M 0 0");
  });
});

describe("react-flow change reducer", () => {
  it("applies position, dimensions, and select changes", () => {
    const nodes = [semantic("a"), semantic("b")];
    const next = createCanvasNodeChangeReducer(nodes, [
      { id: "a", type: "position", position: { x: 40, y: 60 } },
      { id: "b", type: "dimensions", dimensions: { width: 220, height: 90 } },
      { id: "b", type: "select", selected: true },
    ]);

    expect(next.find((node) => node.id === "a")?.position).toEqual({ x: 40, y: 60 });
    expect(next.find((node) => node.id === "b")?.width).toBe(220);
    expect(next.find((node) => node.id === "b")?.selected).toBe(true);
  });

  it("removes nodes and keeps parents before children", () => {
    const nodes = [group("parent"), semantic("child", 0, 0, "parent"), semantic("other")];
    const next = createCanvasNodeChangeReducer(nodes, [{ id: "other", type: "remove" }]);
    expect(next.map((node) => node.id)).toEqual(["parent", "child"]);
  });

  it("accepts added nodes", () => {
    const next = createCanvasNodeChangeReducer([], [{ type: "add", item: shape("shape-1") }]);
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("shape-1");
  });
});
