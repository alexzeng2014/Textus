/** The manuscript's order, kept apart from the files it points at: what
 *  changes here is a list, what changes on disk is a name. Every function
 *  takes a project and returns a new one, so the hook that owns it can tell
 *  whether anything moved. */

import type { DiskPath, NovelAct, NovelChapter, NovelProject } from "./types";
import { chaptersOf } from "./types";

/** Documents the project doesn't list yet, in the order they were found:
 *  an author who dropped a file into the folder expects to see it. They go
 *  before the first act, where a chapter with no act runs. */
export function mergeDiscovered(
  project: NovelProject,
  found: readonly DiskPath[],
  now: number,
): NovelProject {
  const known = new Set(project.chapters.map((chapter) => chapter.path));
  const added: NovelChapter[] = [];
  for (const path of found) {
    if (known.has(path)) continue;
    known.add(path);
    added.push({
      id: `d${now.toString(36)}-${added.length.toString(36)}`,
      path,
      title: "",
      actId: null,
      status: "draft",
    });
  }
  if (added.length === 0) return project;
  // Before the first chapter, so the manuscripts' own order is untouched.
  return { ...project, chapters: [...added, ...project.chapters] };
}

/** The paths the project lists that are no longer on disk. Kept, not
 *  dropped: a chapter renamed outside the app shouldn't vanish from the
 *  manuscript without the author seeing it. */
export function missingPaths(
  project: NovelProject,
  found: readonly DiskPath[],
): ReadonlySet<DiskPath> {
  const onDisk = new Set(found);
  return new Set(
    project.chapters
      .map((chapter) => chapter.path)
      .filter((path) => !onDisk.has(path)),
  );
}

/** Moves chapter `id` so it sits at `toIndex` among all chapters. */
export function moveChapter(
  project: NovelProject,
  id: string,
  toIndex: number,
): NovelProject {
  const from = project.chapters.findIndex((chapter) => chapter.id === id);
  if (from < 0) return project;
  const to = Math.max(0, Math.min(project.chapters.length - 1, toIndex));
  if (from === to) return project;
  const chapters = [...project.chapters];
  const [moved] = chapters.splice(from, 1);
  chapters.splice(to, 0, moved);
  return { ...project, chapters };
}

/** Puts chapter `id` in `actId`, at the end of that act's run: an author
 *  dragging a chapter into a volume means its last place, not wherever it
 *  happened to be. */
export function setChapterAct(
  project: NovelProject,
  id: string,
  actId: string | null,
): NovelProject {
  const chapters = project.chapters.map((chapter) =>
    chapter.id === id ? { ...chapter, actId } : chapter,
  );
  const moved = chapters.find((chapter) => chapter.id === id);
  if (!moved) return project;
  const rest = chapters.filter((chapter) => chapter.id !== id);
  // After the last chapter already in that act. With none to follow, a
  // volume's chapter goes last and an unassigned one goes first, which is
  // where "before the first act" means.
  let at = actId === null ? 0 : rest.length;
  for (let i = rest.length - 1; i >= 0; i--) {
    if (rest[i].actId === actId) {
      at = i + 1;
      break;
    }
  }
  rest.splice(at, 0, moved);
  return { ...project, chapters: rest };
}

/** The project with chapter `id`'s title set; "" means use the file name. */
export function renameChapter(
  project: NovelProject,
  id: string,
  title: string,
): NovelProject {
  return {
    ...project,
    chapters: project.chapters.map((chapter) =>
      chapter.id === id ? { ...chapter, title } : chapter,
    ),
  };
}

/** The whole manuscript's count, and each chapter's, by chapter id. */
export function wordTotals(
  project: NovelProject,
  wordsById: ReadonlyMap<string, number>,
): { total: number; byId: ReadonlyMap<string, number> } {
  let total = 0;
  const byId = new Map<string, number>();
  for (const chapter of project.chapters) {
    const words = wordsById.get(chapter.id) ?? 0;
    byId.set(chapter.id, words);
    total += words;
  }
  return { total, byId };
}

/** One volume's chapters, for the panel that draws them. */
export interface ChapterGroup {
  /** The volume, or null for chapters before the first one. */
  act: NovelAct | null;
  chapters: NovelChapter[];
}

/** The manuscript as the panel draws it: chapters with no volume first,
 *  then each volume in order, empty ones included so there is somewhere to
 *  drag a chapter into. */
export function groupChapters(project: NovelProject): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  const unassigned = chaptersOf(project, null);
  if (unassigned.length > 0) groups.push({ act: null, chapters: unassigned });
  for (const act of project.acts) {
    groups.push({ act, chapters: chaptersOf(project, act.id) });
  }
  return groups;
}
