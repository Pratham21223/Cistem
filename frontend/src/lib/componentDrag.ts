import type { DragEvent } from "react";

import type { KnowledgeComponent } from "@/types/knowledge";

export const COMPONENT_DRAG_TYPE = "application/cistem-component";

export function setComponentDragData(event: DragEvent, component: KnowledgeComponent): void {
  event.dataTransfer.setData(COMPONENT_DRAG_TYPE, component.type);
  event.dataTransfer.effectAllowed = "copy";
}

export function readComponentDragType(event: DragEvent): string | null {
  const type = event.dataTransfer.getData(COMPONENT_DRAG_TYPE);
  return type.length > 0 ? type : null;
}
