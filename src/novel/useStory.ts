/** A folder's story: the storylines, the narrative order and the plot
 *  grids, kept in one file beside the manuscript. */

import { useCallback, useEffect, useRef, useState } from "react";
import { fs } from "../platform/ipc";
import { emptyStory, normaliseStory } from "./story";
import type { NovelStory } from "./story";

export const storyFile = (root: string) =>
  `${root.replace(/[\\/]+$/, "")}/.textus/novel/story.json`;

/** The story on disk; the empty one when there is none, or it can't be
 *  read - a hand-edited file shouldn't take the board away. */
export async function readStory(root: string): Promise<NovelStory> {
  try {
    return normaliseStory(JSON.parse(await fs.readTextFile(storyFile(root))));
  } catch {
    return emptyStory();
  }
}

/** A folder's story, with the one way it changes: `update` takes the next
 *  value from the current one and writes it. */
export function useStory(root: string | null) {
  const [story, setStory] = useState<NovelStory>(emptyStory);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    if (!root) {
      setStory(emptyStory());
      return;
    }
    setLoading(true);
    const loaded = await readStory(root);
    if (mine !== generation.current) return;
    setStory(loaded);
    setLoading(false);
  }, [root]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = useCallback(
    (change: (current: NovelStory) => NovelStory) => {
      setStory((previous) => {
        const next = change(previous);
        if (next === previous) return previous;
        if (root) void writeStory(root, next).catch(() => {});
        return next;
      });
    },
    [root],
  );

  return { story, loading, update, reload };
}

async function writeStory(root: string, story: NovelStory): Promise<void> {
  await fs.writeTextFile(
    storyFile(root),
    JSON.stringify(story, null, 2) + "\n",
  );
}
