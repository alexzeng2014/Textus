/** The novel behind a folder: its structure, the chapters found beside it,
 *  and how long each one is. Loading is per folder, so switching projects
 *  never shows the last one's numbers over the new one's chapters. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countWords } from "../utils/word-count";
import { fs } from "../platform/ipc";
import {
  absoluteChapterPath,
  discoverChapterPaths,
  readNovelProject,
  writeNovelProject,
} from "./novel-project";
import { mergeDiscovered, missingPaths, wordTotals } from "./chapters";
import type { DiskPath, NovelProject } from "./types";
import { emptyProject } from "./types";

export interface NovelState {
  project: NovelProject;
  /** Documents found under the root, whether or not listed in the project. */
  paths: readonly DiskPath[];
  /** Chapter id to its document's word count. */
  wordsByChapter: ReadonlyMap<string, number>;
  totalWords: number;
  /** Listed chapters whose document is gone: shown, but not openable. */
  missing: ReadonlySet<DiskPath>;
  /** The folder is being read, and numbers aren't in yet. */
  loading: boolean;
}

const NOTHING: NovelState = {
  project: emptyProject(),
  paths: [],
  wordsByChapter: new Map(),
  totalWords: 0,
  missing: new Set(),
  loading: false,
};

/** Every chapter's word count, read together: one round of reads for the
 *  panel that shows them all at once. A document that can't be read counts
 *  as zero rather than failing the load. */
async function countChapters(
  root: string,
  paths: readonly DiskPath[],
): Promise<{ byPath: Map<DiskPath, number> }> {
  const byPath = new Map<DiskPath, number>();
  await Promise.all(
    paths.map(async (path) => {
      try {
        const text = await fs.readTextFile(absoluteChapterPath(root, path));
        byPath.set(path, countWords(text).words);
      } catch {
        byPath.set(path, 0);
      }
    }),
  );
  return { byPath };
}

/** Reads a folder's novel: its structure, the documents under it, and their
 *  lengths. Null root (no folder open) gives the empty state. */
async function load(root: string): Promise<{
  project: NovelProject;
  paths: DiskPath[];
  byPath: Map<DiskPath, number>;
}> {
  const [stored, paths] = await Promise.all([
    readNovelProject(root),
    discoverChapterPaths(root),
  ]);
  const project = mergeDiscovered(stored, paths, Date.now());
  const { byPath } = await countChapters(root, paths);
  return { project, paths, byPath };
}

/**
 * A folder's novel, with the ways the manuscript changes. `changes` are
 * written back as they happen; every other caller reads the same state.
 */
export function useNovelProject(root: string | null) {
  const [state, setState] = useState<NovelState>(NOTHING);
  // Loads finish out of order when a folder is swapped; only the newest
  // root's answer may be shown.
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    if (!root) {
      setState(NOTHING);
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const { project, paths, byPath } = await load(root);
    if (mine !== generation.current) return;
    const wordsByChapter = new Map(
      project.chapters.map((chapter) => [
        chapter.id,
        byPath.get(chapter.path) ?? 0,
      ]),
    );
    setState({
      project,
      paths,
      wordsByChapter,
      totalWords: wordTotals(project, wordsByChapter).total,
      missing: missingPaths(project, paths),
      loading: false,
    });
  }, [root]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Applies `change` to the structure and writes it. The write is fired and
   *  watched only for failure: the panel already shows the new order. */
  const update = useCallback(
    (change: (current: NovelProject) => NovelProject) => {
      setState((prev) => {
        const next = change(prev.project);
        if (next === prev.project) return prev;
        if (root) void writeNovelProject(root, next).catch(() => {});
        return { ...prev, project: next };
      });
    },
    [root],
  );

  /** Picks up documents added or removed outside the app. */
  const syncFromDisk = useCallback(async () => {
    if (!root) return;
    const mine = generation.current;
    const paths = await discoverChapterPaths(root);
    if (mine !== generation.current) return;
    const { byPath } = await countChapters(root, paths);
    if (mine !== generation.current) return;
    setState((prev) => {
      const project = mergeDiscovered(prev.project, paths, Date.now());
      const wordsByChapter = new Map(
        project.chapters.map((chapter) => [
          chapter.id,
          byPath.get(chapter.path) ?? 0,
        ]),
      );
      if (project !== prev.project) {
        void writeNovelProject(root, project).catch(() => {});
      }
      return {
        ...prev,
        project,
        paths,
        wordsByChapter,
        totalWords: wordTotals(project, wordsByChapter).total,
        missing: missingPaths(project, paths),
      };
    });
  }, [root]);

  return useMemo(
    () => ({ ...state, reload, update, syncFromDisk, root }),
    [state, reload, update, syncFromDisk, root],
  );
}
