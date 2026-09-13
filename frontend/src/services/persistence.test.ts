import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  createProjectRecord,
  deleteDatabaseForTests,
  getGuestId,
  loadArchitectureGraph,
  loadCanvasDocument,
  loadKnowledgeCache,
  listProjects,
  listProjectImages,
  putImage,
  resetDatabaseConnection,
  saveArchitectureGraph,
  saveCanvasDocument,
  saveKnowledgeCache,
  saveSnapshot,
  listSnapshots,
  setLastProjectId,
  getLastProjectId,
} from "@/services/persistence";
import { createEmptyGraph } from "@/types/architecture";
import type { CanvasDocument } from "@/types/canvas";
import type { KnowledgeComponent } from "@/types/knowledge";

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

describe("persistence", () => {
  beforeEach(async () => {
    await deleteDatabaseForTests();
    resetDatabaseConnection();
    localStorage.clear();
  });

  it("creates and lists projects most-recently-updated first", async () => {
    const first = await createProjectRecord("First");
    const second = await createProjectRecord("Second");
    const projects = await listProjects();

    expect(projects.map((project) => project.id)).toEqual([second.id, first.id]);
  });

  it("stores and reloads the canvas document", async () => {
    const project = await createProjectRecord("Doc");
    const document: CanvasDocument = {
      ...emptyDocument(),
      viewport: { x: 12, y: -8, zoom: 1.5 },
    };

    await saveCanvasDocument(project.id, document);
    expect(await loadCanvasDocument(project.id)).toEqual(document);
  });

  it("rejects corrupt canvas records instead of trusting them", async () => {
    const project = await createProjectRecord("Corrupt");
    const database = await (await import("@/services/persistence")).getDatabase();
    await database.put("canvasDocuments", {
      projectId: project.id,
      updatedAt: new Date().toISOString(),
      value: { schemaVersion: 2, nonsense: true } as unknown as CanvasDocument,
    });

    expect(await loadCanvasDocument(project.id)).toBeNull();
  });

  it("stores and reloads the architecture graph", async () => {
    const project = await createProjectRecord("Graph");
    const graph = {
      ...createEmptyGraph(),
      components: [
        {
          id: "a",
          type: "redis",
          label: "Redis",
          category: "storage" as const,
          source: "user_selected" as const,
          confidence: 1,
          metadata: {},
        },
      ],
    };

    await saveArchitectureGraph(project.id, graph);
    expect(await loadArchitectureGraph(project.id)).toEqual(graph);
  });

  it("stores image blobs per project", async () => {
    const project = await createProjectRecord("Images");
    const blob = new Blob(["fake"], { type: "image/png" });
    await putImage(project.id, "img-1", blob);

    const images = await listProjectImages(project.id);
    expect(images).toHaveLength(1);
    expect(images[0]?.id).toBe("img-1");
    expect(images[0]?.blob).toBeTruthy();
  });

  it("stores snapshots per project", async () => {
    const project = await createProjectRecord("Snapshots");
    await saveSnapshot({
      projectId: project.id,
      label: "Before refactor",
      canvas: emptyDocument(),
      architecture: createEmptyGraph(),
    });

    const snapshots = await listSnapshots(project.id);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.label).toBe("Before refactor");
  });

  it("caches the knowledge library", async () => {
    const component: KnowledgeComponent = {
      type: "redis",
      name: "Redis",
      category: "storage",
      purpose: ["caching"],
      characteristics: {},
      tradeoffs: [],
      alternatives: [],
      commonPatterns: [],
      antiPatterns: [],
    };
    await saveKnowledgeCache([component]);

    const cache = await loadKnowledgeCache();
    expect(cache?.components).toEqual([component]);
  });

  it("generates a stable guest id and last-project metadata in localStorage", () => {
    const guestId = getGuestId();
    expect(getGuestId()).toBe(guestId);

    setLastProjectId("project-1");
    expect(getLastProjectId()).toBe("project-1");
  });
});
