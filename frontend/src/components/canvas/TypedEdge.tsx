import { EdgeLabelRenderer, Position, type EdgeProps } from "@xyflow/react";
import { memo, useMemo } from "react";

import {
  arrowheadSegments,
  cubicBezierPoints,
  edgeControlPoints,
  roughCurvePaths,
  roughLinePaths,
  type HandleSide,
} from "@/engine/rough";
import { EDGE_DASH, EDGE_STROKE_CLASS, isRelationshipType } from "@/lib/canvasVisuals";
import { cn } from "@/lib/utils";

function toHandleSide(position: Position | undefined): HandleSide {
  switch (position) {
    case Position.Left:
      return "left";
    case Position.Top:
      return "top";
    case Position.Bottom:
      return "bottom";
    default:
      return "right";
  }
}

const CURVE_STEPS = 16;

export const TypedEdge = memo(function TypedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  type,
  label,
  selected,
}: EdgeProps) {
  const edgeType = isRelationshipType(type) ? type : "request_flow";
  const sourceSide = toHandleSide(sourcePosition);
  const targetSide = toHandleSide(targetPosition);
  const strokeWidth = selected ? 2.4 : 1.9;
  const dash = EDGE_DASH[edgeType];

  const points = useMemo(() => {
    const { control1, control2 } = edgeControlPoints(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      sourceSide,
      targetSide,
    );
    return cubicBezierPoints(
      { x: sourceX, y: sourceY },
      control1,
      control2,
      { x: targetX, y: targetY },
      CURVE_STEPS,
    );
  }, [sourceX, sourceY, targetX, targetY, sourceSide, targetSide]);

  const curvePaths = useMemo(
    () =>
      roughCurvePaths(points, {
        seed: id,
        strokeWidth,
        ...(dash ? { strokeLineDash: dash } : {}),
      }),
    [id, points, strokeWidth, dash],
  );

  const arrowPaths = useMemo(() => {
    const tip = points[points.length - 1];
    const from = points[points.length - 2];
    if (!tip || !from) return [];
    return arrowheadSegments(tip, from, 12, 0.42).flatMap(([start, end], index) =>
      roughLinePaths(start.x, start.y, end.x, end.y, {
        seed: `${id}-arrow-${index}`,
        strokeWidth,
      }),
    );
  }, [id, points, strokeWidth]);

  const strokeClass = selected ? "stroke-edge-selected" : EDGE_STROKE_CLASS[edgeType];
  const strokeDasharray = dash ? dash.join(" ") : undefined;
  const labelPoint = points[Math.floor(points.length / 2)];

  return (
    <>
      {curvePaths.map((path, index) => (
        <path
          key={`curve-${index}`}
          d={path.d}
          fill="none"
          strokeWidth={path.strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClass}
        />
      ))}
      {arrowPaths.map((path, index) => (
        <path
          key={`arrow-${index}`}
          d={path.d}
          fill="none"
          strokeWidth={path.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClass}
        />
      ))}
      {typeof label === "string" && label.length > 0 && labelPoint ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "pointer-events-none absolute z-10 rounded-md border border-border bg-surface/95 px-1.5 py-0.5",
              "font-hand text-[16px] leading-tight text-text-secondary shadow-xs",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
