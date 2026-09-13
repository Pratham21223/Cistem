import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";

import type { ArchitectureGraph } from "@/types/architecture";
import type { CanvasDocument } from "@/types/canvas";
import type { KnowledgeComponent } from "@/types/knowledge";

const DATABASE_NAME = "cistem";
const DATABASE_VERSION = 1;
const GUEST_ID_KEY = "cistem.guestId";
const LAST_PROJECT_ID_KEY = "cistem.lastProjectId";

export type ProjectRecord = {
  id: string;
  name: string;
  guestId: string;
  createdAt: string;
  updatedAt: string;
};

export type SnapshotRecord = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  canvas: CanvasDocument;
  architecture: ArchitectureGraph;
};

export type KnowledgeCacheRecord = {
  id: "components";
  fetchedAt: string;
  components: KnowledgeComponent[];
};

type StoredRecord<T> = { projectId: string; updatedAt: string; value: T };

interface CistemDatabase extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { "by-updated": string };
  };
  canvasDocuments: { key: string; value: StoredRecord<CanvasDocument> };
  architectureGraphs: { key: string; value: StoredRecord<ArchitectureGraph> };
  contexts: { key: string; value: StoredRecord<unknown> };
  images: {
    key: string;
    value: { id: string; projectId: string; blob: Blob; createdAt: string };
    indexes: { "by-project": string };
  };
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: { "by-project": string };
  };
  knowledgeCache: { key: string; value: KnowledgeCacheRecord };
}

let databasePromise: Promise<IDBPDatabase<CistemDatabase>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<CistemDatabase>> {
  databasePromise ??= openDB<CistemDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      const projects = database.createObjectStore("projects", { keyPath: "id" });
      projects.createIndex("by-updated", "updatedAt");

      database.createObjectStore("canvasDocuments", { keyPath: "projectId" });
      database.createObjectStore("architectureGraphs", { keyPath: "projectId" });
      database.createObjectStore("contexts", { keyPath: "projectId" });

      const images = database.createObjectStore("images", { keyPath: "id" });
      images.createIndex("by-project", "projectId");

      const snapshots = database.createObjectStore("snapshots", { keyPath: "id" });
      snapshots.createIndex("by-project", "projectId");

      database.createObjectStore("knowledgeCache", { keyPath: "id" });
    },
  });
  return databasePromise;
}

/** Tests only: drop the cached connection so a fresh (in-memory) database is opened. */
export function resetDatabaseConnection(): void {
  databasePromise = null;
}

/** Tests only: close and delete the database so suites never depend on execution order. */
export async function deleteDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    const database = await databasePromise.catch(() => null);
    database?.close();
  }
  databasePromise = null;
  await deleteDB(DATABASE_NAME).catch(() => undefined);
}

/**
 * Stored records are written by this app, so validation is a corruption guard rather than a
 * trust boundary. Deep semantic validation happens at API/AI boundaries.
 */
const canvasDocumentSchema = z.looseObject({
  schemaVersion: z.literal(1),
  nodes: z.array(z.looseObject({ id: z.string(), type: z.string() })),
  edges: z.array(z.looseObject({ id: z.string(), source: z.string(), target: z.string() })),
  strokes: z.array(z.looseObject({ id: z.string() })),
  comments: z.array(z.looseObject({ id: z.string() })),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});

const architectureGraphSchema = z.looseObject({
  application: z.unknown().nullable(),
  components: z.array(z.looseObject({ id: z.string(), type: z.string() })),
  connections: z.array(z.looseObject({ id: z.string() })),
  requirements: z.array(z.looseObject({ id: z.string(), originalText: z.string() })),
  assumptions: z.array(z.looseObject({ id: z.string(), text: z.string() })),
});

// ── Guest / session metadata (localStorage only — context.md §42) ─────────────

export function getGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
    return guestId;
  } catch {
    return crypto.randomUUID();
  }
}

export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_ID_KEY);
  } catch {
    return null;
  }
}

export function setLastProjectId(projectId: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_ID_KEY, projectId);
  } catch {
    // Private mode can block storage; the session still works for this tab.
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ProjectRecord[]> {
  const database = await getDatabase();
  const projects = await database.getAllFromIndex("projects", "by-updated");
  return projects.reverse();
}

export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  const database = await getDatabase();
  return (await database.get("projects", projectId)) ?? null;
}

export async function createProjectRecord(name: string): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    id: crypto.randomUUID(),
    name,
    guestId: getGuestId(),
    createdAt: now,
    updatedAt: now,
  };
  const database = await getDatabase();
  await database.put("projects", record);
  return record;
}

export async function renameProjectRecord(projectId: string, name: string): Promise<void> {
  const database = await getDatabase();
  const existing = await database.get("projects", projectId);
  if (!existing) return;
  await database.put("projects", { ...existing, name, updatedAt: new Date().toISOString() });
}

export async function touchProject(projectId: string): Promise<void> {
  const database = await getDatabase();
  const existing = await database.get("projects", projectId);
  if (!existing) return;
  await database.put("projects", { ...existing, updatedAt: new Date().toISOString() });
}

// ── Canvas + architecture graph ───────────────────────────────────────────────

export async function saveCanvasDocument(
  projectId: string,
  document: CanvasDocument,
): Promise<void> {
  const database = await getDatabase();
  await database.put("canvasDocuments", {
    projectId,
    updatedAt: new Date().toISOString(),
    value: document,
  });
}

export async function loadCanvasDocument(projectId: string): Promise<CanvasDocument | null> {
  const database = await getDatabase();
  const record = await database.get("canvasDocuments", projectId);
  if (!record) return null;
  const parsed = canvasDocumentSchema.safeParse(record.value);
  return parsed.success ? record.value : null;
}

export async function saveArchitectureGraph(
  projectId: string,
  graph: ArchitectureGraph,
): Promise<void> {
  const database = await getDatabase();
  await database.put("architectureGraphs", {
    projectId,
    updatedAt: new Date().toISOString(),
    value: graph,
  });
}

export async function loadArchitectureGraph(projectId: string): Promise<ArchitectureGraph | null> {
  const database = await getDatabase();
  const record = await database.get("architectureGraphs", projectId);
  if (!record) return null;
  const parsed = architectureGraphSchema.safeParse(record.value);
  return parsed.success ? record.value : null;
}

// ── Images (blobs live in IndexedDB — context.md §43) ────────────────────────

export async function putImage(projectId: string, imageId: string, blob: Blob): Promise<void> {
  const database = await getDatabase();
  await database.put("images", {
    id: imageId,
    projectId,
    blob,
    createdAt: new Date().toISOString(),
  });
}

export async function listProjectImages(projectId: string): Promise<{ id: string; blob: Blob }[]> {
  const database = await getDatabase();
  const records = await database.getAllFromIndex("images", "by-project", projectId);
  return records.map((record) => ({ id: record.id, blob: record.blob }));
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function saveSnapshot(
  snapshot: Omit<SnapshotRecord, "id" | "createdAt">,
): Promise<SnapshotRecord> {
  const record: SnapshotRecord = {
    ...snapshot,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const database = await getDatabase();
  await database.put("snapshots", record);
  return record;
}

export async function listSnapshots(projectId: string): Promise<SnapshotRecord[]> {
  const database = await getDatabase();
  const snapshots = await database.getAllFromIndex("snapshots", "by-project", projectId);
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSnapshot(snapshotId: string): Promise<SnapshotRecord | null> {
  const database = await getDatabase();
  return (await database.get("snapshots", snapshotId)) ?? null;
}

// ── Knowledge cache ───────────────────────────────────────────────────────────

export async function loadKnowledgeCache(): Promise<KnowledgeCacheRecord | null> {
  const database = await getDatabase();
  return (await database.get("knowledgeCache", "components")) ?? null;
}

export async function saveKnowledgeCache(components: KnowledgeComponent[]): Promise<void> {
  const database = await getDatabase();
  await database.put("knowledgeCache", {
    id: "components",
    fetchedAt: new Date().toISOString(),
    components,
  });
}
