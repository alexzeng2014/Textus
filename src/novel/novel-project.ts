/** Where a novel keeps its structure, and how it gets there: one JSON file
 *  beside the chapters, read with the same care as any file that may have
 *  been edited by hand. */

import { fs } from "../platform/ipc";
import { CHAPTER_STATUSES, emptyProject } from "./types";
import type { ChapterStatus, DiskPath, NovelProject } from "./types";

/** The folder a project's novel data lives in, beside `.textus/settings.json`. */
export const novelDir = (root: string) =>
  `${root.replace(/[\\/]+$/, "")}/.textus/novel`;

export const novelProjectFile = (root: string) =>
  `${novelDir(root)}/project.json`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;

/** A project from whatever the file held. Anything unrecognisable becomes
 *  the empty project rather than an error: a hand-edited file shouldn't
 *  make the panel unusable, and the next save rewrites it clean. */
export function normaliseProject(raw: unknown): NovelProject {
  if (!isRecord(raw)) return emptyProject();
  const acts: NovelProject["acts"] = [];
  if (Array.isArray(raw.acts)) {
    for (const entry of raw.acts) {
      if (!isRecord(entry)) continue;
      const id = str(entry.id);
      if (!id || acts.some((act) => act.id === id)) continue;
      acts.push({ id, title: str(entry.title) });
    }
  }
  const actIds = new Set(acts.map((act) => act.id));
  const chapters: NovelProject["chapters"] = [];
  if (Array.isArray(raw.chapters)) {
    for (const entry of raw.chapters) {
      if (!isRecord(entry)) continue;
      const id = str(entry.id);
      const path = str(entry.path);
      if (!id || !path || chapters.some((chapter) => chapter.id === id)) {
        continue;
      }
      const actId = str(entry.actId);
      chapters.push({
        id,
        path,
        title: str(entry.title),
        // A chapter pointing at an act that isn't there runs before the first.
        actId: actIds.has(actId) ? actId : null,
        status: statusOf(entry.status),
      });
    }
  }
  const goals = isRecord(raw.goals) ? raw.goals : {};
  return {
    version: 1,
    title: str(raw.title),
    goals: {
      dailyWords: count(goals.dailyWords),
      totalWords: count(goals.totalWords),
    },
    acts,
    chapters,
  };
}

function statusOf(value: unknown): ChapterStatus {
  return CHAPTER_STATUSES.includes(value as ChapterStatus)
    ? (value as ChapterStatus)
    : "draft";
}

/** The project's structure; the empty one when there is none, or the file
 *  can't be read. */
export async function readNovelProject(root: string): Promise<NovelProject> {
  try {
    return normaliseProject(
      JSON.parse(await fs.readTextFile(novelProjectFile(root))),
    );
  } catch {
    return emptyProject();
  }
}

/** Writes the structure back. The write makes `.textus/novel/` on the way. */
export async function writeNovelProject(
  root: string,
  project: NovelProject,
): Promise<void> {
  await fs.writeTextFile(
    novelProjectFile(root),
    JSON.stringify(project, null, 2) + "\n",
  );
}

/** Folders never searched for chapters: our own data, and what a project
 *  dragged in from a repository carries. */
const SKIP_DIRS = new Set([".textus", ".git", "node_modules"]);
/** A deep tree is a nested project, not a manuscript. */
const MAX_DEPTH = 6;
const CHAPTER_FILE = /\.(md|markdown)$/i;

/** Every Markdown document under `root`, `/`-separated and relative to it,
 *  in the order the folders list them. Unreadable folders are skipped: a
 *  permission error deep in the tree shouldn't empty the manuscript. */
export async function discoverChapterPaths(root: string): Promise<DiskPath[]> {
  const found: DiskPath[] = [];
  const walk = async (dir: string, prefix: string, depth: number) => {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = await fs.listDir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.hidden || entry.ignored) continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.is_dir) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(entry.path, relative, depth + 1);
      } else if (CHAPTER_FILE.test(entry.name)) {
        found.push(relative);
      }
    }
  };
  await walk(root, "", 0);
  return found;
}

/** A project-relative path as the file system wants it. */
export const absoluteChapterPath = (root: string, relative: string): string =>
  `${root.replace(/[\\/]+$/, "")}/${relative}`;
