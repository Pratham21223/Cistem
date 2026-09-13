import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useMemo, useState } from "react";

import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import {
  CanvasContextMenu,
  type CanvasContextMenuState,
} from "@/components/canvas/CanvasContextMenu";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { CommentThread } from "@/components/canvas/CommentThread";
import { RoughSvg } from "@/components/canvas/RoughSvg";
import { getAbsolutePosition } from "@/engine/canvasGraph";
import {
  roughCurvePaths,
  roughEllipsePaths,
  roughLinePaths,
  roughRoundedRectanglePaths,
  type RoughPath,
} from "@/engine/rough";
import { useCanvasStore } from "@/stores/canvasStore";

export function CanvasArea() {
  return (
    <ReactFlowProvider>
      <CanvasWorkspace />
    </ReactFlowProvider>
  );
}

function CanvasWorkspace() {
  const nodes = useCanvasStore((state) => state.nodes);
  const [menu, setMenu] = useState<CanvasContextMenuState | null>(null);
  const [commentTargetId, setCommentTargetId] = useState<string | null>(null);
  const { flowToScreenPosition } = useReactFlow();

  const commentPosition = useMemo(() => {
    if (!commentTargetId) return null;
    const node = nodes.find((candidate) => candidate.id === commentTargetId);
    if (!node) return null;
    const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));
    const absolute = getAbsolutePosition(node, byId);
    return flowToScreenPosition({ x: absolute.x + node.width + 16, y: absolute.y });
  }, [commentTargetId, nodes, flowToScreenPosition]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <ArchitectureCanvas
        onNodeContextMenu={(event, nodeId) =>
          setMenu({ x: event.clientX, y: event.clientY, nodeId })
        }
        onPaneContextMenu={(event) => setMenu({ x: event.clientX, y: event.clientY, nodeId: null })}
        onPaneClick={() => {
          setMenu(null);
          setCommentTargetId(null);
        }}
      />
      <CanvasToolbar />

      {nodes.length === 0 ? <EmptyCanvasHint /> : null}

      {menu ? (
        <CanvasContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onAddComment={(nodeId) => setCommentTargetId(nodeId)}
        />
      ) : null}

      {commentTargetId && commentPosition ? (
        <CommentThread
          targetId={commentTargetId}
          x={commentPosition.x}
          y={commentPosition.y}
          onClose={() => setCommentTargetId(null)}
        />
      ) : null}
    </div>
  );
}

const CARD_WIDTH = 384;
const CARD_HEIGHT = 176;

function EmptyCanvasHint() {
  const cardPaths = useMemo(
    () =>
      roughRoundedRectanglePaths(CARD_WIDTH, CARD_HEIGHT, 20, {
        seed: "empty-card",
        strokeWidth: 1.6,
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <GhostShapes />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <PointerSquiggle />
          <div className="absolute inset-0 rounded-3xl bg-surface/90 shadow-sm backdrop-blur-sm" />
          <RoughSvg
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            paths={cardPaths}
            className="stroke-stroke opacity-70"
          />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
            <h2 className="text-display leading-tight text-text-primary">Start designing</h2>
            <p className="mt-2 text-body text-text-secondary">
              Press <span className="font-mono text-caption text-text-primary">P</span> to draw,{" "}
              <span className="font-mono text-caption text-text-primary">N</span> for a sticky note,
              or <span className="font-mono text-caption text-text-primary">T</span> to type. Paste
              a screenshot to place it on the canvas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type GhostShape = { paths: RoughPath[]; x: number; y: number };

/** Faint example diagram behind the empty-state card so a finished canvas feels reachable. */
function GhostShapes() {
  const shapes = useMemo<GhostShape[]>(
    () => [
      {
        paths: roughRoundedRectanglePaths(200, 88, 16, { seed: "ghost-node-a", strokeWidth: 2 }),
        x: 120,
        y: 150,
      },
      {
        paths: roughEllipsePaths(150, 96, { seed: "ghost-node-b", strokeWidth: 2 }),
        x: 430,
        y: 90,
      },
      {
        paths: roughRoundedRectanglePaths(150, 72, 12, { seed: "ghost-node-c", strokeWidth: 2 }),
        x: 640,
        y: 320,
      },
      {
        paths: roughCurvePaths(
          [
            { x: 320, y: 190 },
            { x: 380, y: 160 },
            { x: 430, y: 180 },
            { x: 500, y: 150 },
          ],
          { seed: "ghost-edge-a", strokeWidth: 2 },
        ),
        x: 0,
        y: 0,
      },
      {
        paths: roughCurvePaths(
          [
            { x: 560, y: 180 },
            { x: 620, y: 240 },
            { x: 660, y: 300 },
            { x: 700, y: 340 },
          ],
          { seed: "ghost-edge-b", strokeWidth: 2 },
        ),
        x: 0,
        y: 0,
      },
      {
        paths: roughLinePaths(500, 150, 482, 138, { seed: "ghost-arrow-a", strokeWidth: 2 }).concat(
          roughLinePaths(500, 150, 486, 152, { seed: "ghost-arrow-b", strokeWidth: 2 }),
        ),
        x: 0,
        y: 0,
      },
    ],
    [],
  );

  return (
    <svg
      aria-hidden
      viewBox="0 0 900 520"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full stroke-stroke opacity-[0.08] dark:opacity-[0.14]"
    >
      {shapes.map((shape, index) => (
        <g key={index} transform={`translate(${shape.x} ${shape.y})`}>
          {shape.paths.map((path, pathIndex) => (
            <path
              key={pathIndex}
              d={path.d}
              fill="none"
              strokeWidth={path.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function PointerSquiggle() {
  const paths = useMemo(() => {
    const curve = roughCurvePaths(
      [
        { x: 250, y: 10 },
        { x: 295, y: 2 },
        { x: 330, y: 6 },
        { x: 368, y: 2 },
      ],
      { seed: "empty-pointer", strokeWidth: 1.8 },
    );
    const headA = roughLinePaths(368, 2, 354, 5, { seed: "empty-pointer-a", strokeWidth: 1.8 });
    const headB = roughLinePaths(368, 2, 357, 13, { seed: "empty-pointer-b", strokeWidth: 1.8 });
    return [...curve, ...headA, ...headB];
  }, []);

  return (
    <svg
      aria-hidden
      width={CARD_WIDTH}
      height={40}
      viewBox={`0 0 ${CARD_WIDTH} 40`}
      className="absolute -top-9 left-0 overflow-visible stroke-accent opacity-50"
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill="none"
          strokeWidth={path.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
