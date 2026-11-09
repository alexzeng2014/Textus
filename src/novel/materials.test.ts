import { describe, expect, it } from "vitest";
import { MATERIALS_DIR, materialOf } from "./materials";

describe("materialOf", () => {
  it("names a note by its file, without the extension", () => {
    expect(materialOf("materials/海港城.md")).toEqual({
      path: "materials/海港城.md",
      title: "海港城",
      isNote: true,
    });
  });

  it("keeps a note in a subfolder, path and all", () => {
    expect(materialOf("materials/人物/李四.markdown")?.title).toBe("李四");
  });

  it("treats anything else as an attachment, extension and all", () => {
    // Its own extension is how a reader tells an image from a note.
    expect(materialOf("materials/地图.png")).toEqual({
      path: "materials/地图.png",
      title: "地图.png",
      isNote: false,
    });
  });

  it("refuses a file outside the materials folder", () => {
    expect(materialOf("codex/character/li-si.md")).toBeNull();
    expect(materialOf("chapter-01.md")).toBeNull();
    // A folder named like the prefix, not the folder itself.
    expect(materialOf("materials-old/note.md")).toBeNull();
  });

  it("refuses the folder itself", () => {
    expect(materialOf(`${MATERIALS_DIR}/`)).toBeNull();
    expect(materialOf(MATERIALS_DIR)).toBeNull();
  });
});
