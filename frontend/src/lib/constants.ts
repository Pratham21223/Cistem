import type { CanvasNodeType, CanvasTool } from "@/types/canvas";

export const HISTORY_LIMIT = 100;

export const ROUGH_STROKE_WIDTH = 1.6;

export const GRID_SIZE = 16;

export const MIN_DRAG_DISTANCE_PX = 6;

export const ERASER_RADIUS = 8;

export const COPY_PASTE_OFFSET = 16;

export const GROUP_PADDING = 24;

export const MAX_IMAGE_DIMENSION = 320;

export const SEMANTIC_NODE_SIZE = { width: 176, height: 64 } as const;

export const DEFAULT_NODE_SIZES: Record<CanvasNodeType, { width: number; height: number }> = {
  semantic: SEMANTIC_NODE_SIZE,
  text: { width: 200, height: 48 },
  shape: { width: 160, height: 100 },
  note: { width: 180, height: 160 },
  image: { width: 240, height: 160 },
  group: { width: 320, height: 240 },
  frame: { width: 480, height: 320 },
};

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;

export const TOOL_SHORTCUTS: Record<CanvasTool, string> = {
  select: "V",
  hand: "H",
  rectangle: "R",
  ellipse: "O",
  arrow: "A",
  connector: "L",
  pen: "P",
  eraser: "E",
  text: "T",
  note: "N",
  label: "B",
  frame: "F",
};

export const TOOL_KEYS: Record<string, CanvasTool> = {
  v: "select",
  h: "hand",
  r: "rectangle",
  o: "ellipse",
  a: "arrow",
  l: "connector",
  p: "pen",
  e: "eraser",
  t: "text",
  n: "note",
  b: "label",
  f: "frame",
};

export const DRAWING_TOOLS: ReadonlySet<CanvasTool> = new Set([
  "pen",
  "eraser",
  "rectangle",
  "ellipse",
  "frame",
  "text",
  "note",
  "label",
]);

/** Default edge type created by each connection tool (edge type UI arrives in P2). */
export const CONNECTION_TOOL_EDGE_TYPE = {
  select: "request_flow",
  arrow: "request_flow",
  connector: "data_flow",
} as const;
