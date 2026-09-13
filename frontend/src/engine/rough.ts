import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";

export type RoughPath = {
  d: string;
  strokeWidth: number;
};

export type RoughOutlineOptions = {
  seed: string | number;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  strokeLineDash?: number[];
  disableMultiStroke?: boolean;
};

export type Point = { x: number; y: number };

const generator = rough.generator();

/** Deterministic seed per element so the wobble never changes across re-renders or undo. */
export function hashStringToSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function resolveSeed(seed: string | number): number {
  return typeof seed === "number" ? seed : hashStringToSeed(seed);
}

function toOptions(options: RoughOutlineOptions): Options {
  return {
    seed: resolveSeed(options.seed),
    // Geometry only: colors are applied by CSS classes on the rendered paths.
    stroke: "#000000",
    strokeWidth: options.strokeWidth ?? 1.6,
    roughness: options.roughness ?? 1.1,
    bowing: options.bowing ?? 1,
    disableMultiStroke: options.disableMultiStroke ?? true,
    ...(options.strokeLineDash ? { strokeLineDash: options.strokeLineDash } : {}),
  };
}

function toPaths(drawable: Drawable): RoughPath[] {
  return generator.toPaths(drawable).map((path) => ({
    d: path.d,
    strokeWidth: path.strokeWidth ?? 1,
  }));
}

export function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return [
    `M ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height - r}`,
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
    `L ${x + r} ${y + height}`,
    `Q ${x} ${y + height} ${x} ${y + height - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

export function roughRectanglePaths(
  width: number,
  height: number,
  options: RoughOutlineOptions,
): RoughPath[] {
  const inset = 1;
  return toPaths(
    generator.rectangle(
      inset,
      inset,
      Math.max(width - inset * 2, 1),
      Math.max(height - inset * 2, 1),
      toOptions(options),
    ),
  );
}

export function roughRoundedRectanglePaths(
  width: number,
  height: number,
  radius: number,
  options: RoughOutlineOptions,
): RoughPath[] {
  const inset = 1;
  const innerWidth = Math.max(width - inset * 2, 1);
  const innerHeight = Math.max(height - inset * 2, 1);
  const path = roundedRectPath(
    inset,
    inset,
    innerWidth,
    innerHeight,
    Math.min(radius, innerWidth / 2, innerHeight / 2),
  );
  return toPaths(generator.path(path, toOptions(options)));
}

export function roughEllipsePaths(
  width: number,
  height: number,
  options: RoughOutlineOptions,
): RoughPath[] {
  return toPaths(
    generator.ellipse(
      width / 2,
      height / 2,
      Math.max(width - 2, 1),
      Math.max(height - 2, 1),
      toOptions(options),
    ),
  );
}

export function roughLinePaths(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: RoughOutlineOptions,
): RoughPath[] {
  return toPaths(generator.line(x1, y1, x2, y2, toOptions(options)));
}

export function roughCurvePaths(points: Point[], options: RoughOutlineOptions): RoughPath[] {
  if (points.length < 2) return [];
  return toPaths(
    generator.curve(
      points.map((point) => [point.x, point.y] as [number, number]),
      toOptions(options),
    ),
  );
}

export type HandleSide = "left" | "right" | "top" | "bottom";

function controlOffset(distance: number): number {
  return Math.max(36, distance * 0.35);
}

/** Control points that leave each handle along its axis, mirroring React Flow's bezier shape. */
export function edgeControlPoints(
  source: Point,
  target: Point,
  sourceSide: HandleSide,
  targetSide: HandleSide,
): { control1: Point; control2: Point } {
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const offset = controlOffset(distance);

  const control1: Point =
    sourceSide === "left"
      ? { x: source.x - offset, y: source.y }
      : sourceSide === "right"
        ? { x: source.x + offset, y: source.y }
        : sourceSide === "top"
          ? { x: source.x, y: source.y - offset }
          : { x: source.x, y: source.y + offset };

  const control2: Point =
    targetSide === "left"
      ? { x: target.x - offset, y: target.y }
      : targetSide === "right"
        ? { x: target.x + offset, y: target.y }
        : targetSide === "top"
          ? { x: target.x, y: target.y - offset }
          : { x: target.x, y: target.y + offset };

  return { control1, control2 };
}

export function cubicBezierPoints(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  steps = 14,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const inverse = 1 - t;
    const x =
      inverse * inverse * inverse * start.x +
      3 * inverse * inverse * t * control1.x +
      3 * inverse * t * t * control2.x +
      t * t * t * end.x;
    const y =
      inverse * inverse * inverse * start.y +
      3 * inverse * inverse * t * control1.y +
      3 * inverse * t * t * control2.y +
      t * t * t * end.y;
    points.push({ x, y });
  }
  return points;
}

/** Two short segments forming an open hand-drawn arrowhead at `tip`, pointing away from `from`. */
export function arrowheadSegments(
  tip: Point,
  from: Point,
  length = 11,
  spreadRadians = 0.5,
): [Point, Point][] {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const left = {
    x: tip.x - length * Math.cos(angle - spreadRadians),
    y: tip.y - length * Math.sin(angle - spreadRadians),
  };
  const right = {
    x: tip.x - length * Math.cos(angle + spreadRadians),
    y: tip.y - length * Math.sin(angle + spreadRadians),
  };
  return [
    [left, tip],
    [right, tip],
  ];
}
