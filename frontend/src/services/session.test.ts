import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deleteDatabaseForTests, resetDatabaseConnection } from "@/services/persistence";
import {
  createNewProject,
  flushAutosave,
  initializeSession,
  listActiveSnapshots,
  restoreSnapshot,
  saveSnapshotNow,
  stopSession,
  switchProject,
} from "@/services/session";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useProjectStore } from "@/stores/projectStore";
import { createEmptyGraph } from "@/types/architecture";
import type { CanvasDocument, SemanticNode } from "@/types/canvas";

function emptyDocument(): CanvasDocument {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    strokes: [],
    comments: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function semantic(id: string): SemanticNode {
  return {
    id,
    type: "semantic",
    position: { x: 0, y: 0 },
    width: 176,
    height: 64,
    data: {},
    label: `Node ${id}`,
    componentType: "redis",
    category: "storage",
    provenance: "user_selected",
    confidence: 1,
  };
}

describe("guest session persistence", () => {
  beforeEach(async () => {
    stopSession();
    await deleteDatabaseForTests();
    resetDatabaseConnection();
    localStorage.clear();
    useCanvasStore.getState().loadDocument(emptyDocument());
    useArchitectureStore.setState({ graph: createEmptyGraph(), revision: 0 });
    useProjectStore.setState({
      projects: [],
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      saveError: null,
      isOnline: true,
    });
  });

  afterEach(() => {
    stopSession();
  });

  it("restores the exact canvas and graph after a simulated refresh", async () => {
    await initializeSession();
    const projectId = useProjectStore.getState().projectId;

    useCanvasStore.getState().addNode(semantic("a"));
    useCanvasStore.getState().addStroke({
      id: "s1",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      width: 2,
      color: "stroke",
    });
    await flushAutosave();

    // Simulated reload: kill listeners, reset stores, boot again from IndexedDB.
    stopSession();
    useCanvasStore.getState().loadDocument(emptyDocument());
    useArchitectureStore.setState({ graph: createEmptyGraph(), revision: 0 });

    await initializeSession();

    expect(useProjectStore.getState().projectId).toBe(projectId);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
    expect(useCanvasStore.getState().strokes).toHaveLength(1);
    expect(useArchitectureStore.getState().graph.components).toHaveLength(1);
  });

  it("creates and switches between local projects without losing work", async () => {
    await initializeSession();
    const firstId = useProjectStore.getState().projectId;

    useCanvasStore.getState().addNode(semantic("a"));
    await flushAutosave();

    await createNewProject();
    const secondId = useProjectStore.getState().projectId;
    expect(secondId).not.toBe(firstId);
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
    expect(useProjectStore.getState().projects).toHaveLength(2);

    await switchProject(firstId);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });

  it("saves and restores snapshots", async () => {
    await initializeSession();
    useCanvasStore.getState().addNode(semantic("a"));
    await saveSnapshotNow("before change");

    useCanvasStore.getState().addNode(semantic("b"));
    await flushAutosave();
    expect(useCanvasStore.getState().nodes).toHaveLength(2);

    const snapshots = await listActiveSnapshots();
    expect(snapshots[0]?.label).toBe("before change");
    await restoreSnapshot(snapshots[0].id);

    expect(useCanvasStore.getState().nodes).toHaveLength(1);
    expect(useCanvasStore.getState().nodes[0]?.id).toBe("a");
  });
});
