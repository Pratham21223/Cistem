import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

/**
 * Four loose source handles per node (ConnectionMode.Loose lets a source handle act
 * as either endpoint), so arrows can be started and landed from any side.
 */
export const NodeHandles = memo(function NodeHandles({ radius = 4 }: { radius?: number }) {
  const size = radius * 2;

  return (
    <>
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        style={{ width: size, height: size }}
        className="!rounded-full !border !border-accent !bg-surface opacity-0 shadow-xs transition-opacity duration-fast group-hover:opacity-100"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ width: size, height: size }}
        className="!rounded-full !border !border-accent !bg-surface opacity-0 shadow-xs transition-opacity duration-fast group-hover:opacity-100"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{ width: size, height: size }}
        className="!rounded-full !border !border-accent !bg-surface opacity-0 shadow-xs transition-opacity duration-fast group-hover:opacity-100"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        style={{ width: size, height: size }}
        className="!rounded-full !border !border-accent !bg-surface opacity-0 shadow-xs transition-opacity duration-fast group-hover:opacity-100"
      />
    </>
  );
});
