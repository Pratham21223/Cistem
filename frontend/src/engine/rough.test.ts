import { describe, expect, it } from "vitest";

import {
  arrowheadSegments,
  cubicBezierPoints,
  edgeControlPoints,
  hashStringToSeed,
  roughCurvePaths,
  roughEllipsePaths,
  roughRectanglePaths,
  roughRoundedRectanglePaths,
  roundedRectPath,
} from "@/engine/rough";

describe("rough seeds", () => {
  it("are deterministic and positive", () => {
    expect(hashStringToSeed("node-a")).toBe(hashStringToSeed("node-a"));
    expect(hashStringToSeed("node-a")).toBeGreaterThan(0);
    expect(hashStringToSeed("node-a")).not.toBe(hashStringToSeed("node-b"));
  });
});

describe("rough outline paths", () => {
  it("generates a rectangle outline", () => {
    const paths = roughRectanglePaths(120, 60, { seed: "r1" });
    expect(paths).toHaveLength(1);
    expect(paths[0]?.d.startsWith("M")).toBe(true);
    expect(paths[0]?.d.length).toBeGreaterThan(20);
  });

  it("is stable for the same seed and shape", () => {
    const first = roughRectanglePaths(80, 40, { seed: "stable" });
    const second = roughRectanglePaths(80, 40, { seed: "stable" });
    expect(second[0]?.d).toBe(first[0]?.d);
  });

  it("changes when the seed changes", () => {
    const first = roughRectanglePaths(80, 40, { seed: "seed-1" });
    const second = roughRectanglePaths(80, 40, { seed: "seed-2" });
    expect(second[0]?.d).not.toBe(first[0]?.d);
  });

  it("generates rounded rectangles and ellipses", () => {
    expect(roughRoundedRectanglePaths(160, 64, 12, { seed: "rr" })[0]?.d).toContain("C");
    expect(roughEllipsePaths(100, 60, { seed: "el" })[0]?.d.startsWith("M")).toBe(true);
    expect(roundedRectPath(0, 0, 100, 50, 10)).toContain("Q");
  });

  it("generates curves and skips degenerate input", () => {
    expect(roughCurvePaths([], { seed: 1 })).toEqual([]);
    expect(roughCurvePaths([{ x: 0, y: 0 }], { seed: 1 })).toEqual([]);
    expect(
      roughCurvePaths(
        [
          { x: 0, y: 0 },
          { x: 40, y: 20 },
          { x: 80, y: 0 },
        ],
        { seed: 9 },
      )[0]?.d,
    ).toContain("C");
  });
});

describe("edge geometry", () => {
  it("places controls along the handle axis", () => {
    const { control1, control2 } = edgeControlPoints(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      "right",
      "left",
    );
    expect(control1.x).toBeGreaterThan(0);
    expect(control1.y).toBe(0);
    expect(control2.x).toBeLessThan(200);
    expect(control2.y).toBe(0);
  });

  it("samples a cubic bezier with fixed endpoints", () => {
    const points = cubicBezierPoints(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 160, y: 100 },
      { x: 200, y: 100 },
      10,
    );
    expect(points).toHaveLength(11);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[10]?.x).toBeCloseTo(200);
    expect(points[10]?.y).toBeCloseTo(100);
  });

  it("builds a two-segment arrowhead ending at the tip", () => {
    const segments = arrowheadSegments({ x: 100, y: 0 }, { x: 0, y: 0 });
    expect(segments).toHaveLength(2);
    for (const [, tip] of segments) {
      expect(tip).toEqual({ x: 100, y: 0 });
    }
    expect(segments[0]?.[0].x).toBeLessThan(100);
  });
});
