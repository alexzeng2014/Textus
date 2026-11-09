/** A novel's structure, kept in `.textus/novel/project.json` beside the
 *  chapters it describes. The shape follows Drifting's book model
 *  (domain/book-node.ts, domain/book-act.ts) with its database columns
 *  replaced by this file: the manuscript keeps its order here, the prose
 *  stays in ordinary Markdown documents the rest of the app already edits. */

export interface NovelProject {
  version: 1;
  /** What the cover would say. Empty until the author names the book. */
  title: string;
  goals: NovelGoals;
  /** Volumes, in the order they run. */
  acts: NovelAct[];
  /** Chapters in reading order, across every act. */
  chapters: NovelChapter[];
}

/** How much is being aimed at. Zero means no aim, not a target of zero. */
export interface NovelGoals {
  dailyWords: number;
  totalWords: number;
}

/** A volume. Chapters name it by id rather than nesting, so moving one
 *  between acts is a single field and the order stays one list. */
export interface NovelAct {
  id: string;
  title: string;
}

/** How far a chapter has got. */
export type ChapterStatus = "draft" | "revised" | "done";

export interface NovelChapter {
  id: string;
  /** Relative to the project root, `/`-separated: the document the app
   *  opens is this file, found the same way the file tree finds it. */
  path: string;
  /** What the manuscript calls it. Empty falls back to the file's name. */
  title: string;
  /** The act it runs in, or null for one before the first act. */
  actId: string | null;
  status: ChapterStatus;
}

/** A document found under the project root, `/`-separated and relative. */
export type DiskPath = string;

export const CHAPTER_STATUSES: readonly ChapterStatus[] = [
  "draft",
  "revised",
  "done",
];

/** A project with nothing in it, for a folder that has no novel yet. */
export function emptyProject(): NovelProject {
  return {
    version: 1,
    title: "",
    goals: { dailyWords: 0, totalWords: 0 },
    acts: [],
    chapters: [],
  };
}

/** A chapter's name as the manuscript shows it: its own title, else the
 *  document's file name without the extension. */
export function chapterTitle(chapter: NovelChapter): string {
  if (chapter.title.trim()) return chapter.title.trim();
  const name = chapter.path.split("/").pop() ?? chapter.path;
  return name.replace(/\.(md|markdown)$/i, "");
}

/** The chapters of `actId` in order; pass null for those before any act. */
export function chaptersOf(
  project: NovelProject,
  actId: string | null,
): NovelChapter[] {
  return project.chapters.filter((chapter) => chapter.actId === actId);
}

/** A new id no chapter or act in `project` already uses. Callers pass the
 *  time so this stays a pure function. */
export function newId(project: NovelProject, now: number): string {
  const taken = new Set([
    ...project.chapters.map((chapter) => chapter.id),
    ...project.acts.map((act) => act.id),
  ]);
  let n = 0;
  // Same millisecond twice is common (two clicks), so count up from it.
  while (taken.has(`n${now.toString(36)}-${n.toString(36)}`)) n++;
  return `n${now.toString(36)}-${n.toString(36)}`;
}
