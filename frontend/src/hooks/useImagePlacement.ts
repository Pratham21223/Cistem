import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

import { MAX_IMAGE_DIMENSION } from "@/lib/constants";
import { getImageUrl, readImageDimensions, registerImage } from "@/services/imageRegistry";
import { useCanvasStore } from "@/stores/canvasStore";

/**
 * Registers an image blob in the local registry and places an image node near the
 * viewport center with the natural aspect ratio preserved.
 */
export function useImagePlacement(): (file: File) => Promise<void> {
  const addNode = useCanvasStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  return useCallback(
    async (file: File) => {
      const imageId = registerImage(file);
      const url = getImageUrl(imageId);
      const natural = url ? await readImageDimensions(url) : { width: 1, height: 1 };
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(natural.width, natural.height, 1));
      const width = Math.max(80, Math.round(natural.width * scale));
      const height = Math.max(60, Math.round(natural.height * scale));
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      addNode({
        id: crypto.randomUUID(),
        type: "image",
        imageId,
        alt: file.name.length > 0 ? file.name : "Pasted image",
        position: { x: center.x - width / 2, y: center.y - height / 2 },
        width,
        height,
        data: {},
        selected: true,
      });
    },
    [addNode, screenToFlowPosition],
  );
}
