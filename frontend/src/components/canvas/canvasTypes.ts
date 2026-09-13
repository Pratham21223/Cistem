import type { EdgeTypes, NodeTypes } from "@xyflow/react";

import { ArchitectureNode } from "@/components/canvas/ArchitectureNode";
import { CustomNode } from "@/components/canvas/CustomNode";
import { FrameNode } from "@/components/canvas/FrameNode";
import { GroupNode } from "@/components/canvas/GroupNode";
import { ImageNode } from "@/components/canvas/ImageNode";
import { TypedEdge } from "@/components/canvas/TypedEdge";

export const NODE_TYPES: NodeTypes = {
  semantic: ArchitectureNode,
  text: CustomNode,
  shape: CustomNode,
  note: CustomNode,
  image: ImageNode,
  group: GroupNode,
  frame: FrameNode,
};

export const EDGE_TYPES: EdgeTypes = {
  request_flow: TypedEdge,
  data_flow: TypedEdge,
  event_flow: TypedEdge,
  replication: TypedEdge,
  dependency: TypedEdge,
  annotation: TypedEdge,
};
