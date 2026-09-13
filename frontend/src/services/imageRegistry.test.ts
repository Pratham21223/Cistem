import "fake-indexeddb/auto";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  clearImageCache,
  getImageUrl,
  hydrateProjectImages,
  registerImage,
} from "@/services/imageRegistry";
import {
  listProjectImages,
  putImage,
  deleteDatabaseForTests,
  resetDatabaseConnection,
} from "@/services/persistence";
import { useProjectStore } from "@/stores/projectStore";

let objectUrlCounter = 0;

describe("imageRegistry", () => {
  beforeAll(() => {
    URL.createObjectURL = () => `blob:mock-${++objectUrlCounter}`;
    URL.revokeObjectURL = () => undefined;
  });

  beforeEach(async () => {
    await deleteDatabaseForTests();
    resetDatabaseConnection();
    clearImageCache();
    useProjectStore.setState({ projectId: "project-1" });
  });

  afterEach(() => {
    clearImageCache();
  });

  it("registers a blob, returns an object URL, and persists it", async () => {
    const imageId = registerImage(new Blob(["bytes"], { type: "image/png" }));
    expect(getImageUrl(imageId)).toMatch(/^blob:mock-/);

    // Persistence is fire-and-forget; yield once so putImage settles.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const images = await listProjectImages("project-1");
    expect(images.some((image) => image.id === imageId)).toBe(true);
  });

  it("hydrates stored blobs after the cache is cleared (simulated reload)", async () => {
    const projectId = "project-2";
    await putImage(projectId, "img-stored", new Blob(["stored"], { type: "image/png" }));

    clearImageCache();
    expect(getImageUrl("img-stored")).toBeNull();

    await hydrateProjectImages(projectId);
    expect(getImageUrl("img-stored")).toMatch(/^blob:mock-/);
  });
});
