import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import { cn } from "@/lib/utils";

const SIDES = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

type NodeHandlesProps = {
  radius?: number;
  /** Selected nodes keep their handles visible; otherwise they appear on hover. */
  visible?: boolean;
};

/**
 * Four loose source handles per node (ConnectionMode.Loose lets a source handle act
 * as either endpoint), so arrows can be started and landed from any side.
 */
export const NodeHandles = memo(function NodeHandles({
  radius = 4,
  visible = false,
}: NodeHandlesProps) {
  const size = radius * 2;

  return (
    <>
      {SIDES.map((side) => (
        <Handle
          key={side.id}
          id={side.id}
          type="source"
          position={side.position}
          style={{ width: size, height: size }}
          className={cn(
            "!rounded-full !border !border-accent !bg-surface opacity-0 shadow-xs transition-opacity duration-fast group-hover:opacity-100",
            visible && "opacity-100",
          )}
        />
      ))}
    </>
  );
});
