import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";
import { projectArchitectureNow, startArchitectureAnalysis } from "@/services/analysis";
import { clearImageCache, hydrateProjectImages } from "@/services/imageRegistry";
import {
  createProjectRecord,
  getLastProjectId,
  getProject,
  getSnapshot,
  listProjects,
  listSnapshots,
  loadArchitectureGraph,
  loadCanvasDocument,
  renameProjectRecord,
  saveArchitectureGraph,
  saveCanvasDocument,
  saveSnapshot,
  setLastProjectId,
  touchProject,
  type ProjectRecord,
  type SnapshotRecord,
} from "@/services/persistence";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useProjectStore } from "@/stores/projectStore";
import { createEmptyGraph } from "@/types/architecture";
import type { CanvasDocument } from "@/types/canvas";
import type { ProjectSummary } from "@/types/project";

type PersistedRefs = {
  nodes: ReturnType<typeof useCanvasStore.getState>["nodes"];
  edges: ReturnType<typeof useCanvasStore.getState>["edges"];
  strokes: ReturnType<typeof useCanvasStore.getState>["strokes"];
  comments: ReturnType<typeof useCanvasStore.getState>["comments"];
  viewport: ReturnType<typeof useCanvasStore.getState>["viewport"];
  graph: ReturnType<typeof useArchitectureStore.getState>["graph"];
};

let persisted: PersistedRefs | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let stopAnalysis: (() => void) | null = null;
let unsubscribers: (() => void)[] = [];
let initialized = false;

function emptyCanvasDocument(): CanvasDocument {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    strokes: [],
    comments: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function currentCanvasDocument(): CanvasDocument {
  const state = useCanvasStore.getState();
  return {
    schemaVersion: 1,
    nodes: state.nodes,
    edges: state.edges,
    strokes: state.strokes,
    comments: state.comments,
    viewport: state.viewport,
  };
}

function toSummary(record: ProjectRecord): ProjectSummary {
  return { id: record.id, name: record.name, updatedAt: record.updatedAt };
}

function captureRefs(): PersistedRefs {
  const canvas = useCanvasStore.getState();
  return {
    nodes: canvas.nodes,
    edges: canvas.edges,
    strokes: canvas.strokes,
    comments: canvas.comments,
    viewport: canvas.viewport,
    graph: useArchitectureStore.getState().graph,
  };
}

function hasCanvasChanges(): boolean {
  const state = useCanvasStore.getState();
  return (
    persisted === null ||
    state.nodes !== persisted.nodes ||
    state.edges !== persisted.edges ||
    state.strokes !== persisted.strokes ||
    state.comments !== persisted.comments ||
    state.viewport !== persisted.viewport
  );
}

function hasGraphChanges(): boolean {
  return persisted === null || useArchitectureStore.getState().graph !== persisted.graph;
}

function describeStorageError(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Local storage is full — free space or remove old snapshots.";
  }
  return "Local save failed. Your work is still open in this tab.";
}

async function persistCurrent(): Promise<void> {
  const projectId = useProjectStore.getState().projectId;
  if (!projectId) return;
  // The in-flight save reschedules itself if edits landed during the write.
  if (useProjectStore.getState().isSaving) return;

  // Capture the exact snapshot being written before awaiting, so edits made
  // during the write stay dirty and are saved by the next scheduled pass.
  projectArchitectureNow();
  const canvas = currentCanvasDocument();
  const graph = useArchitectureStore.getState().graph;
  const writtenRefs: PersistedRefs = {
    nodes: canvas.nodes,
    edges: canvas.edges,
    strokes: canvas.strokes,
    comments: canvas.comments,
    viewport: canvas.viewport,
    graph,
  };

  useProjectStore.getState().setSaving(true);
  useProjectStore.getState().setSaveError(null);
  try {
    await saveCanvasDocument(projectId, canvas);
    await saveArchitectureGraph(projectId, graph);
    await touchProject(projectId);

    persisted = writtenRefs;
    const savedAt = new Date().toISOString();
    useProjectStore.getState().setSaved(savedAt);
    useProjectStore
      .getState()
      .setProjects(
        useProjectStore
          .getState()
          .projects.map((project) =>
            project.id === projectId ? { ...project, updatedAt: savedAt } : project,
          ),
      );

    if (hasCanvasChanges() || hasGraphChanges()) scheduleAutosave();
  } catch (error) {
    useProjectStore.getState().setSaveError(describeStorageError(error));
  }
}

function scheduleAutosave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistCurrent();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function markDirtyAndSchedule(): void {
  useProjectStore.getState().setDirty(true);
  scheduleAutosave();
}

export function flushAutosave(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!useProjectStore.getState().isDirty) return Promise.resolve();
  return persistCurrent();
}

function handleOnline(): void {
  useProjectStore.getState().setOnline(true);
}

function handleOffline(): void {
  useProjectStore.getState().setOnline(false);
}

function handlePageHide(): void {
  void flushAutosave();
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden") void flushAutosave();
}

function startAutosave(): void {
  unsubscribers = [
    useCanvasStore.subscribe((state, previous) => {
      if (hasCanvasChanges()) markDirtyAndSchedule();
      if (state.tool !== previous.tool) void flushAutosave();
    }),
    useArchitectureStore.subscribe(() => {
      if (hasGraphChanges()) markDirtyAndSchedule();
    }),
  ];
}

async function loadProjectIntoStores(projectId: string): Promise<boolean> {
  const record = await getProject(projectId);
  if (!record) return false;

  const [canvas, graph] = await Promise.all([
    loadCanvasDocument(projectId),
    loadArchitectureGraph(projectId),
  ]);

  clearImageCache();
  useCanvasStore.getState().loadDocument(canvas ?? emptyCanvasDocument());
  useArchitectureStore.getState().setGraph(graph ?? createEmptyGraph());
  await hydrateProjectImages(projectId);

  setLastProjectId(projectId);
  useProjectStore.getState().setActiveProject(record);
  persisted = captureRefs();

  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  useProjectStore.getState().setDirty(false);
  return true;
}

/** Boots the guest session: last project or a fresh one, then autosave + analysis. */
export async function initializeSession(): Promise<void> {
  if (initialized) return;
  initialized = true;
  useProjectStore.getState().setOnline(navigator.onLine);

  try {
    let projects = await listProjects();
    let activeId = getLastProjectId();

    if (!activeId || !projects.some((project) => project.id === activeId)) {
      if (projects.length === 0) {
        projects = [await createProjectRecord("Untitled design")];
      }
      activeId = projects[0]?.id ?? null;
    }
    if (!activeId) throw new Error("No local project could be created.");

    useProjectStore.getState().setProjects(projects.map(toSummary));
    await loadProjectIntoStores(activeId);

    startAutosave();
    stopAnalysis = startArchitectureAnalysis();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  } catch {
    useProjectStore
      .getState()
      .setSaveError("Local storage is unavailable — changes will not be saved.");
  }
}

/** Stops listeners and timers (tests and future sign-out). */
export function stopSession(): void {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  stopAnalysis?.();
  stopAnalysis = null;
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
  window.removeEventListener("pagehide", handlePageHide);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  persisted = null;
  initialized = false;
}

export async function createNewProject(): Promise<void> {
  await flushAutosave();
  const record = await createProjectRecord("Untitled design");
  useProjectStore.getState().setProjects((await listProjects()).map(toSummary));
  await loadProjectIntoStores(record.id);
  await persistCurrent();
}

export async function switchProject(projectId: string): Promise<void> {
  if (projectId === useProjectStore.getState().projectId) return;
  await flushAutosave();
  await loadProjectIntoStores(projectId);
}

export async function renameActiveProject(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0) return;
  const projectId = useProjectStore.getState().projectId;
  await renameProjectRecord(projectId, trimmed);
  useProjectStore.getState().setProjectName(trimmed);
  useProjectStore.getState().setProjects((await listProjects()).map(toSummary));
}

export async function saveSnapshotNow(label?: string): Promise<void> {
  await persistCurrent();
  await saveSnapshot({
    projectId: useProjectStore.getState().projectId,
    label: label ?? new Date().toLocaleString(),
    canvas: currentCanvasDocument(),
    architecture: useArchitectureStore.getState().graph,
  });
}

export function listActiveSnapshots(): Promise<SnapshotRecord[]> {
  return listSnapshots(useProjectStore.getState().projectId);
}

export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot) return;
  clearImageCache();
  useCanvasStore.getState().loadDocument(snapshot.canvas);
  useArchitectureStore.getState().setGraph(snapshot.architecture);
  await hydrateProjectImages(snapshot.projectId);
  persisted = captureRefs();
  useProjectStore.getState().setDirty(true);
  await persistCurrent();
}
