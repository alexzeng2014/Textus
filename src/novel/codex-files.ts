/** Reading a project's codex off the disk: the cards themselves, whichever
 *  part of the app is asking - the panel, the `@` list, a backreference. */

import { fs } from "../platform/ipc";
import { absoluteChapterPath } from "./novel-project";
import {
  CODEX_KINDS,
  cardFromMarkdown,
  codexCardPath,
  codexKindDir,
} from "./codex";
import type { CodexCard } from "./codex";

/** Every card under the project's codex, kind by kind. A folder that isn't
 *  there (a project without a codex yet) is not an error: it simply has no
 *  cards. A card that can't be read is left out rather than failing the
 *  whole list. */
export async function readCodex(root: string): Promise<CodexCard[]> {
  const cards: CodexCard[] = [];
  for (const kind of CODEX_KINDS) {
    let entries;
    try {
      entries = await fs.listDir(absoluteChapterPath(root, codexKindDir(kind)));
    } catch {
      continue;
    }
    const found = await Promise.all(
      entries
        .filter((entry) => !entry.is_dir && /\.md$/i.test(entry.name))
        .map(async (entry) => {
          const path = codexCardPath(kind, entry.name.replace(/\.md$/i, ""));
          try {
            return cardFromMarkdown(
              path,
              await fs.readTextFile(absoluteChapterPath(root, path)),
            );
          } catch {
            return null;
          }
        }),
    );
    for (const card of found) if (card) cards.push(card);
  }
  return cards;
}
