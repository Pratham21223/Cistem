import type { ComponentCategory, Provenance, RelationshipType } from "@/types/architecture";

export type Vec2 = { x: number; y: number };

export type CanvasViewport = { x: number; y: number; zoom: number };

export type CanvasTool =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "connector"
  | "pen"
  | "eraser"
  | "text"
  | "note"
  | "label"
  | "frame";

type CanvasNodeBase = {
  id: string;
  position: Vec2;
  width: number;
  height: number;
  parentId?: string;
  selected?: boolean;
  hidden?: boolean;
  /** React Flow requires a data bag; Cistem keeps semantics on typed top-level fields. */
  data: Record<string, unknown>;
};

export type SemanticNode = CanvasNodeBase & {
  type: "semantic";
  label: string;
  componentType: string;
  category: ComponentCategory;
  provenance: Provenance;
  confidence: number | null;
};

export type TextNode = CanvasNodeBase & {
  type: "text";
  text: string;
  variant: "text" | "label";
};

export type ShapeNode = CanvasNodeBase & {
  type: "shape";
  shape: "rectangle" | "ellipse";
};

export type NoteNode = CanvasNodeBase & {
  type: "note";
  text: string;
};

export type ImageNode = CanvasNodeBase & {
  type: "image";
  imageId: string;
  alt: string;
};

export type GroupNode = CanvasNodeBase & {
  type: "group";
};

export type FrameNode = CanvasNodeBase & {
  type: "frame";
  label: string;
};

export type CanvasNode =
  SemanticNode | TextNode | ShapeNode | NoteNode | ImageNode | GroupNode | FrameNode;

export type CanvasNodeType = CanvasNode["type"];

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: RelationshipType;
  label?: string | null;
  selected?: boolean;
};

export type StrokePoint = Vec2 & { pressure?: number };

export type Stroke = {
  id: string;
  points: StrokePoint[];
  width: number;
  color: "stroke";
};

export type CanvasComment = {
  id: string;
  targetId: string;
  author: string;
  text: string;
  createdAt: string;
  resolved?: boolean;
};

export type CanvasSnapshot = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  strokes: Stroke[];
  comments: CanvasComment[];
};

export type CanvasDocument = CanvasSnapshot & {
  schemaVersion: 1;
  viewport: CanvasViewport;
};
