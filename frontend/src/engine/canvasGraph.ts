import type { EdgeChange, NodeChange } from "@xyflow/react";

import type { CanvasEdge, CanvasNode, Stroke, StrokePoint, Vec2 } from "@/types/canvas";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRect(
  start: Vec2,
  end: Vec2,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function childrenByParent(nodes: CanvasNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = map.get(node.parentId);
    if (siblings) {
      siblings.push(node.id);
    } else {
      map.set(node.parentId, [node.id]);
    }
  }
  return map;
}

/** Every id reachable through parentId, including the roots themselves. */
export function collectDescendantIds(nodes: CanvasNode[], rootIds: Iterable<string>): Set<string> {
  const result = new Set<string>(rootIds);
  const byParent = childrenByParent(nodes);
  const stack = [...result];

  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) continue;
    for (const childId of byParent.get(id) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }

  return result;
}

/** React Flow requires parents to appear before their children in the nodes array. */
export function sortNodesParentsFirst(nodes: CanvasNode[]): CanvasNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result: CanvasNode[] = [];
  const visited = new Set<string>();

  function visit(node: CanvasNode): void {
    if (visited.has(node.id)) return;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && !visited.has(parent.id)) visit(parent);
    visited.add(node.id);
    result.push(node);
  }

  for (const node of nodes) visit(node);
  return result;
}

/** Position in flow space, summing parent offsets. */
export function getAbsolutePosition(node: CanvasNode, byId: Map<string, CanvasNode>): Vec2 {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const seen = new Set<string>();

  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }

  return { x, y };
}

export function getNodesBounds(
  nodes: CanvasNode[],
): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) return null;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const position = node.parentId ? getAbsolutePosition(node, byId) : node.position;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + node.width);
    maxY = Math.max(maxY, position.y + node.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pointToSegmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

/** Ids of strokes whose polyline passes within `threshold` flow units of the point. */
export function findStrokesNearPoint(strokes: Stroke[], point: Vec2, threshold: number): string[] {
  const hits: string[] = [];

  for (const stroke of strokes) {
    let isHit = false;
    for (let index = 0; index < stroke.points.length - 1; index += 1) {
      const start = stroke.points[index];
      const end = stroke.points[index + 1];
      if (start && end && pointToSegmentDistance(point, start, end) <= threshold) {
        isHit = true;
        break;
      }
    }
    if (!isHit && stroke.points.length === 1) {
      const only = stroke.points[0];
      if (only && Math.hypot(point.x - only.x, point.y - only.y) <= threshold) isHit = true;
    }
    if (isHit) hits.push(stroke.id);
  }

  return hits;
}

/** Smooth path for a freehand stroke; point arrays remain the stored format. */
export function strokePath(points: StrokePoint[]): string {
  const first = points[0];
  if (!first) return "";
  if (points.length === 1) {
    return `M ${first.x} ${first.y} L ${first.x + 0.1} ${first.y + 0.1}`;
  }

  let path = `M ${first.x} ${first.y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) continue;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  if (last) path += ` L ${last.x} ${last.y}`;
  return path;
}

export function createCanvasNodeChangeReducer(
  nodes: CanvasNode[],
  changes: NodeChange<CanvasNode>[],
): CanvasNode[] {
  if (changes.length === 0) return nodes;

  const currentNodeById = new Map(nodes.map((node) => [node.id, node]));
  const updated = new Map<string, CanvasNode>();
  const added: CanvasNode[] = [];
  const removed = new Set<string>();

  function current(nodeId: string): CanvasNode | undefined {
    return updated.get(nodeId) ?? currentNodeById.get(nodeId);
  }

  for (const change of changes) {
    switch (change.type) {
      case "position": {
        if (!change.position) break;
        const node = current(change.id);
        if (node) updated.set(change.id, { ...node, position: { ...change.position } });
        break;
      }
      case "dimensions": {
        if (!change.dimensions) break;
        const node = current(change.id);
        if (node) {
          updated.set(change.id, {
            ...node,
            width: change.dimensions.width,
            height: change.dimensions.height,
          });
        }
        break;
      }
      case "select": {
        const node = current(change.id);
        if (node) updated.set(change.id, { ...node, selected: change.selected });
        break;
      }
      case "remove": {
        removed.add(change.id);
        break;
      }
      case "add": {
        added.push(change.item);
        break;
      }
      case "replace": {
        updated.set(change.item.id, change.item);
        break;
      }
    }
  }

  const result: CanvasNode[] = [];
  for (const node of nodes) {
    if (removed.has(node.id)) continue;
    result.push(updated.get(node.id) ?? node);
  }
  for (const node of added) {
    if (!removed.has(node.id)) result.push(updated.get(node.id) ?? node);
  }
  for (const [id, node] of updated) {
    if (!currentNodeById.has(id) && !added.some((item) => item.id === id)) result.push(node);
  }

  return sortNodesParentsFirst(result);
}

export function applyEdgeChangesToCanvas(
  edges: CanvasEdge[],
  changes: EdgeChange<CanvasEdge>[],
): CanvasEdge[] {
  if (changes.length === 0) return edges;

  const updated = new Map<string, CanvasEdge>();
  const added: CanvasEdge[] = [];
  const removed = new Set<string>();
  const byId = new Map(edges.map((edge) => [edge.id, edge]));

  for (const change of changes) {
    switch (change.type) {
      case "select": {
        const edge = updated.get(change.id) ?? byId.get(change.id);
        if (edge) updated.set(change.id, { ...edge, selected: change.selected });
        break;
      }
      case "remove": {
        removed.add(change.id);
        break;
      }
      case "add": {
        added.push(change.item);
        break;
      }
      case "replace": {
        updated.set(change.item.id, change.item);
        break;
      }
    }
  }

  const result: CanvasEdge[] = [];
  for (const edge of edges) {
    if (removed.has(edge.id)) continue;
    result.push(updated.get(edge.id) ?? edge);
  }
  for (const edge of added) {
    if (!removed.has(edge.id)) result.push(updated.get(edge.id) ?? edge);
  }
  for (const [id, edge] of updated) {
    if (!byId.has(id) && !added.some((item) => item.id === id)) result.push(edge);
  }

  return result;
}
