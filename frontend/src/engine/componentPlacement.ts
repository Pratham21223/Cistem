import { SEMANTIC_NODE_SIZE } from "@/lib/constants";
import type { SemanticNode, Vec2 } from "@/types/canvas";
import type { KnowledgeComponent } from "@/types/knowledge";

/** Builds a user-placed semantic node. Explicit selection carries full confidence. */
export function createSemanticNode(component: KnowledgeComponent, position: Vec2): SemanticNode {
  return {
    id: crypto.randomUUID(),
    type: "semantic",
    position,
    width: SEMANTIC_NODE_SIZE.width,
    height: SEMANTIC_NODE_SIZE.height,
    data: {},
    selected: true,
    label: component.name,
    componentType: component.type,
    category: component.category,
    provenance: "user_selected",
    confidence: 1,
  };
}
