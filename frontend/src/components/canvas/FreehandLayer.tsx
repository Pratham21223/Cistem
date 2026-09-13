import { ViewportPortal, useReactFlow } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

import { findStrokesNearPoint, normalizeRect, strokePath } from "@/engine/canvasGraph";
import {
  DEFAULT_NODE_SIZES,
  DRAWING_TOOLS,
  ERASER_RADIUS,
  MIN_DRAG_DISTANCE_PX,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasNode, Stroke, StrokePoint, Vec2 } from "@/types/canvas";

type DrawSession =
  | { kind: "pen"; points: StrokePoint[] }
  | { kind: "eraser"; removed: Set<string> }
  | { kind: "shape"; tool: "rectangle" | "ellipse" | "frame"; startFlow: Vec2; startScreen: Vec2 };

const CURSOR_CLASS: Partial<Record<string, string>> = {
  pen: "cursor-crosshair",
  eraser: "cursor-cell",
  rectangle: "cursor-crosshair",
  ellipse: "cursor-crosshair",
  frame: "cursor-crosshair",
  text: "cursor-text",
  note: "cursor-copy",
  label: "cursor-text",
};

export function FreehandLayer() {
  const tool = useCanvasStore((state) => state.tool);
  const strokes = useCanvasStore((state) => state.strokes);
  const addStroke = useCanvasStore((state) => state.addStroke);
  const removeStrokes = useCanvasStore((state) => state.removeStrokes);
  const addNode = useCanvasStore((state) => state.addNode);
  const addNodeForEditing = useCanvasStore((state) => state.addNodeForEditing);
  const beginHistory = useCanvasStore((state) => state.beginHistory);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const cancelHistory = useCanvasStore((state) => state.cancelHistory);

  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [draftRect, setDraftRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const sessionRef = useRef<DrawSession | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const toFlow = useCallback(
    (clientX: number, clientY: number): Vec2 => screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition],
  );

  const toContainerPoint = useCallback((clientX: number, clientY: number): Vec2 => {
    const bounds = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (bounds?.left ?? 0), y: clientY - (bounds?.top ?? 0) };
  }, []);

  const createTextLikeNode = useCallback(
    (flow: Vec2): void => {
      const id = crypto.randomUUID();
      const isNote = tool === "note";
      const isLabel = tool === "label";
      const size = isNote
        ? DEFAULT_NODE_SIZES.note
        : isLabel
          ? { width: 160, height: 28 }
          : DEFAULT_NODE_SIZES.text;
      const base = {
        id,
        position: flow,
        width: size.width,
        height: size.height,
        data: {},
        selected: true,
      };

      const node: CanvasNode = isNote
        ? { ...base, type: "note", text: "" }
        : { ...base, type: "text", text: "", variant: isLabel ? "label" : "text" };

      addNodeForEditing(node);
    },
    [addNodeForEditing, tool],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!DRAWING_TOOLS.has(tool) || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const flow = toFlow(event.clientX, event.clientY);
      const screenPoint = toContainerPoint(event.clientX, event.clientY);

      if (tool === "pen") {
        beginHistory();
        const first: StrokePoint = { ...flow };
        if (event.pressure > 0) first.pressure = event.pressure;
        sessionRef.current = { kind: "pen", points: [first] };
        setDraftStroke({ id: "draft", points: [first], width: 2, color: "stroke" });
        return;
      }

      if (tool === "eraser") {
        beginHistory();
        sessionRef.current = { kind: "eraser", removed: new Set() };
        return;
      }

      if (tool === "rectangle" || tool === "ellipse" || tool === "frame") {
        sessionRef.current = {
          kind: "shape",
          tool,
          startFlow: flow,
          startScreen: screenPoint,
        };
        setDraftRect({ left: screenPoint.x, top: screenPoint.y, width: 0, height: 0 });
      }
    },
    [beginHistory, toContainerPoint, toFlow, tool],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session) return;

      const flow = toFlow(event.clientX, event.clientY);

      if (session.kind === "pen") {
        const last = session.points[session.points.length - 1];
        if (last && Math.hypot(flow.x - last.x, flow.y - last.y) < 1.5) return;
        const point: StrokePoint = { ...flow };
        if (event.pressure > 0) point.pressure = event.pressure;
        session.points = [...session.points, point];
        setDraftStroke({ id: "draft", points: session.points, width: 2, color: "stroke" });
        return;
      }

      if (session.kind === "eraser") {
        const hits = findStrokesNearPoint(useCanvasStore.getState().strokes, flow, ERASER_RADIUS);
        const newHits = hits.filter((id) => !session.removed.has(id));
        if (newHits.length > 0) {
          for (const id of newHits) session.removed.add(id);
          removeStrokes(newHits);
        }
        return;
      }

      const screenPoint = toContainerPoint(event.clientX, event.clientY);
      setDraftRect({
        left: Math.min(session.startScreen.x, screenPoint.x),
        top: Math.min(session.startScreen.y, screenPoint.y),
        width: Math.abs(screenPoint.x - session.startScreen.x),
        height: Math.abs(screenPoint.y - session.startScreen.y),
      });
    },
    [removeStrokes, toContainerPoint, toFlow],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      setDraftStroke(null);
      setDraftRect(null);

      if (!session) {
        if (tool === "text" || tool === "note" || tool === "label") {
          createTextLikeNode(toFlow(event.clientX, event.clientY));
        }
        return;
      }

      if (session.kind === "pen") {
        if (session.points.length >= 2) {
          addStroke({
            id: crypto.randomUUID(),
            points: session.points,
            width: 2,
            color: "stroke",
          });
          commitHistory();
        } else {
          cancelHistory();
        }
        return;
      }

      if (session.kind === "eraser") {
        if (session.removed.size > 0) commitHistory();
        else cancelHistory();
        return;
      }

      const endFlow = toFlow(event.clientX, event.clientY);
      const endScreen = toContainerPoint(event.clientX, event.clientY);
      const dragged =
        Math.hypot(endScreen.x - session.startScreen.x, endScreen.y - session.startScreen.y) >=
        MIN_DRAG_DISTANCE_PX;
      const rect = normalizeRect(session.startFlow, endFlow);
      const defaults =
        session.tool === "frame" ? DEFAULT_NODE_SIZES.frame : DEFAULT_NODE_SIZES.shape;

      const base = {
        id: crypto.randomUUID(),
        position: dragged ? { x: rect.x, y: rect.y } : session.startFlow,
        width: dragged ? Math.max(rect.width, 8) : defaults.width,
        height: dragged ? Math.max(rect.height, 8) : defaults.height,
        data: {},
        selected: true,
      };

      const node: CanvasNode =
        session.tool === "frame"
          ? { ...base, type: "frame", label: "Frame" }
          : { ...base, type: "shape", shape: session.tool === "ellipse" ? "ellipse" : "rectangle" };

      addNode(node);
    },
    [
      addNode,
      addStroke,
      cancelHistory,
      commitHistory,
      createTextLikeNode,
      toContainerPoint,
      toFlow,
      tool,
    ],
  );

  const interactive = DRAWING_TOOLS.has(tool);

  return (
    <>
      <ViewportPortal>
        <svg
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={strokePath(stroke.points)}
              fill="none"
              className="stroke-stroke"
              style={{
                strokeWidth: stroke.width,
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            />
          ))}
          {draftStroke ? (
            <path
              d={strokePath(draftStroke.points)}
              fill="none"
              className="stroke-stroke opacity-60"
              style={{
                strokeWidth: draftStroke.width,
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            />
          ) : null}
        </svg>
      </ViewportPortal>

      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 z-10",
          interactive ? cn("pointer-events-auto", CURSOR_CLASS[tool]) : "pointer-events-none",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {draftRect ? (
          <div
            className={cn(
              "absolute border border-accent bg-selection-box",
              tool === "ellipse" ? "rounded-full" : "rounded-md",
            )}
            style={{
              left: draftRect.left,
              top: draftRect.top,
              width: draftRect.width,
              height: draftRect.height,
            }}
          />
        ) : null}
      </div>
    </>
  );
}
