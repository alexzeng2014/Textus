/** A folder's codex: every card under `.textus/novel/codex/`, read once per
 *  folder. The files are the truth, so a card edited in another app shows up
 *  after a reload. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fs } from "../platform/ipc";
import { absoluteChapterPath } from "./novel-project";
import { joinFrontMatter, splitFrontMatter } from "./front-matter";
import {
  CODEX_KINDS,
  cardFromMarkdown,
  cardToMarkdown,
  codexCardPath,
  codexKindDir,
  uniqueSlug,
} from "./codex";
import type { CodexCard, CodexKind } from "./codex";

export interface CodexState {
  cards: readonly CodexCard[];
  loading: boolean;
}

const NOTHING: CodexState = { cards: [], loading: false };

/** Every card under the project's codex, whichever kind's folder holds it.
 *  A folder that isn't there (a project without a codex yet) is not an
 *  error: it simply has no cards. */
async function readCodex(root: string): Promise<CodexCard[]> {
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

/** A folder's codex, with the ways a card is made and renamed. */
export function useCodex(root: string | null) {
  const [state, setState] = useState<CodexState>(NOTHING);
  // A folder swap can finish out of order; only the newest root's cards may
  // be shown.
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    if (!root) {
      setState(NOTHING);
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const cards = await readCodex(root);
    if (mine !== generation.current) return;
    setState({ cards, loading: false });
  }, [root]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Changes a card's front matter and nothing else: the body may be open
   *  in an editor tab with unsaved writing in it, and the panel has no
   *  business rewriting that. The file is reread first, so the write builds
   *  on what is on disk now rather than on what was read with the folder. */
  const setCardFields = useCallback(
    async (card: CodexCard, fields: Record<string, string>) => {
      if (!root) return;
      const path = absoluteChapterPath(root, card.path);
      const text = await fs.readTextFile(path);
      const current = splitFrontMatter(text);
      await fs.writeTextFile(
        path,
        joinFrontMatter({ ...current.fields, ...fields }, current.body),
      );
      await reload();
    },
    [root, reload],
  );

  /** A new, empty card of `kind`, its file written before it is returned so
   *  the caller can open it straight away. */
  const createCard = useCallback(
    async (kind: CodexKind, title: string): Promise<CodexCard | null> => {
      if (!root) return null;
      const slug = uniqueSlug(
        title,
        new Set(state.cards.map((card) => card.slug)),
      );
      const card: CodexCard = {
        kind,
        slug,
        path: codexCardPath(kind, slug),
        title,
        aliases: [],
        group: "",
        body: "",
      };
      await fs.writeTextFile(
        absoluteChapterPath(root, card.path),
        cardToMarkdown(card),
      );
      await reload();
      return card;
    },
    [root, state.cards, reload],
  );

  return useMemo(
    () => ({ ...state, reload, setCardFields, createCard }),
    [state, reload, setCardFields, createCard],
  );
}
