import { listProjectImages, putImage } from "@/services/persistence";
import { useProjectStore } from "@/stores/projectStore";

/**
 * Image blobs live in IndexedDB (P3); object URLs are a render cache. Nodes only ever store
 * an `imageId`, so the canvas contract is unchanged from P1 (`architecture.md` §9.1).
 */
const objectUrls = new Map<string, string>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Registers a blob for the active project and returns its image id. */
export function registerImage(blob: Blob): string {
  const imageId = crypto.randomUUID();
  objectUrls.set(imageId, URL.createObjectURL(blob));
  notify();

  const projectId = useProjectStore.getState().projectId;
  if (projectId) {
    void putImage(projectId, imageId, blob).catch(() => undefined);
  }
  return imageId;
}

export function getImageUrl(imageId: string): string | null {
  return objectUrls.get(imageId) ?? null;
}

export function subscribeImages(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads every blob for a project into the object-URL cache (called on project open). */
export async function hydrateProjectImages(projectId: string): Promise<void> {
  const images = await listProjectImages(projectId);
  for (const image of images) {
    if (!objectUrls.has(image.id)) {
      objectUrls.set(image.id, URL.createObjectURL(image.blob));
    }
  }
  notify();
}

export function clearImageCache(): void {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
  notify();
}

export function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    };
    image.onerror = () => {
      resolve({ width: 1, height: 1 });
    };
    image.src = url;
  });
}
