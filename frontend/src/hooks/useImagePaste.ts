import { useEffect } from "react";

import { useImagePlacement } from "@/hooks/useImagePlacement";

/** Paste an image from the clipboard onto the canvas. */
export function useImagePaste(): void {
  const addImage = useImagePlacement();

  useEffect(() => {
    function handlePaste(event: ClipboardEvent): void {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void addImage(file);
            return;
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addImage]);
}
