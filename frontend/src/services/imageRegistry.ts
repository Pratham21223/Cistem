const objectUrls = new Map<string, string>();

/**
 * Local image blob registry for the working session. P1 keeps image blobs in memory;
 * P3 replaces this with IndexedDB-backed storage without changing the node contract
 * (nodes only ever store an `imageId`).
 */
export function registerImage(blob: Blob): string {
  const imageId = crypto.randomUUID();
  objectUrls.set(imageId, URL.createObjectURL(blob));
  return imageId;
}

export function getImageUrl(imageId: string): string | null {
  return objectUrls.get(imageId) ?? null;
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
