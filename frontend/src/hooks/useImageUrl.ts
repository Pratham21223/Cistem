import { useSyncExternalStore } from "react";

import { getImageUrl, subscribeImages } from "@/services/imageRegistry";

/** Resolves an imageId to an object URL and re-renders when blobs finish hydrating. */
export function useImageUrl(imageId: string): string | null {
  return useSyncExternalStore(
    subscribeImages,
    () => getImageUrl(imageId),
    () => null,
  );
}
