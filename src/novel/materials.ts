/** The research behind the book: a `materials/` folder of notes, and
 *  whatever the notes link to. Nothing here is a document of the
 *  manuscript, so the folder is left out of the chapter scan. */

import { fs } from "../platform/ipc";
import { absoluteChapterPath } from "./novel-project";

export const MATERIALS_DIR = "materials";

export interface Material {
  /** Relative to the project root, `/`-separated. */
  path: string;
  /** The file's name without its extension. */
  title: string;
  /** A Markdown note, which opens in the editor like any other document;
   *  anything else is an attachment the notes link to. */
  isNote: boolean;
}

const NOTE_FILE = /\.(md|markdown)$/i;
const PREFIX = `${MATERIALS_DIR}/`;

/** A file of the materials folder, or null for one somewhere else. */
export function materialOf(path: string): Material | null {
  if (!path.startsWith(PREFIX) || path.length === PREFIX.length) return null;
  const name = path.slice(path.lastIndexOf("/") + 1);
  return {
    path,
    title: name.replace(NOTE_FILE, ""),
    isNote: NOTE_FILE.test(name),
  };
}

/** Every file under the materials folder, notes first and then the rest,
 *  each by path. A folder that isn't there is a project that keeps no
 *  research yet, not an error. */
export async function listMaterials(root: string): Promise<Material[]> {
  const found: Material[] = [];
  const walk = async (dir: string, prefix: string, depth: number) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = await fs.listDir(absoluteChapterPath(root, dir));
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.hidden || entry.ignored) continue;
      const relative = `${prefix}/${entry.name}`;
      if (entry.is_dir) await walk(relative, relative, depth + 1);
      else {
        const material = materialOf(relative);
        if (material) found.push(material);
      }
    }
  };
  await walk(MATERIALS_DIR, MATERIALS_DIR, 0);
  return found.sort((a, b) =>
    a.isNote === b.isNote ? a.path.localeCompare(b.path) : a.isNote ? -1 : 1,
  );
}
