/** `@` in the prose lists the codex. Taking a row writes a link to the card
 *  that reads as its title, so a line can say who it means without the
 *  author typing a path - and the link is what a backreference finds later.
 *
 *  The same shape as the core's `[[` list (sidebar/note-completion.ts): a
 *  module-level root the window sets, and the folder's cards read once and
 *  kept a moment. */

import { addCompletionSource } from "../editor/extension-points";
import type { PanelItem } from "../editor/extension-points";
import { linkToTarget, pathIndex } from "../links/link-resolve";
import type { LinkStyle } from "../links/link-resolve";
import { linkStyleAt } from "../links/link-style";
import { absoluteChapterPath } from "./novel-project";
import { readCodex } from "./codex-files";
import type { CodexCard, CodexKind } from "./codex";

/** An index older than this is read again on the next `@`. */
const FRESH_MS = 10_000;

interface Cards {
  /** Root and document: what the links depend on. */
  key: string;
  at: number;
  items: Promise<PanelItem[]>;
}

let root: string | null = null;
let cards: Cards | null = null;

/** The window's folder, where `@` looks. */
export function setCodexCompletionRoot(next: string | null): void {
  if (next !== root) cards = null;
  root = next;
}

/** One row per card: its title, the kind (or the author's group) beside it,
 *  and a link from `from` as the document's own style writes links.
 *
 *  The path is always written out (`format: "relative"`) rather than
 *  shortened to a bare name: a reference is found by reading the prose, and
 *  only a written path says which card a mention was. */
export function codexItems(
  entries: readonly CodexCard[],
  folder: string,
  from: string,
  style: LinkStyle,
  kindLabel: (kind: CodexKind) => string,
): PanelItem[] {
  const paths = pathIndex(
    folder,
    entries.map((card) => absoluteChapterPath(folder, card.path)),
  );
  return entries.map((card) => ({
    label: card.title,
    detail: card.group || kindLabel(card.kind),
    insert: linkToTarget(
      paths,
      absoluteChapterPath(folder, card.path),
      from,
      { ...style, format: "relative" },
      { alias: card.title },
    ),
  }));
}

function load(
  folder: string,
  from: string,
  key: string,
  kindLabel: (kind: CodexKind) => string,
): Cards {
  const items = Promise.all([readCodex(folder), linkStyleAt(from)]).then(
    ([entries, style]) => codexItems(entries, folder, from, style, kindLabel),
  );
  return { key, at: Date.now(), items };
}

/** The `@` list, made once per folder and document and reused while the
 *  author is still typing the same mention. */
export function registerCodexCompletion(
  title: () => string,
  kindLabel: (kind: CodexKind) => string,
): () => void {
  return addCompletionSource({
    id: "novel.codex",
    owner: "core",
    where: "text",
    // The outer group is what an item replaces ("@li"); the inner one is
    // what the list is filtered by ("li").
    pattern: /(?:^|[\s(（])(@([^\s@[\]()（）]{0,40}))$/,
    replaceGroup: 1,
    title,
    provide: ({ path }) => {
      const folder = root;
      if (!folder) return null;
      const from = path ?? `${folder.replace(/[\\/]+$/, "")}/Untitled.md`;
      const key = `${folder}\n${from}`;
      if (!cards || cards.key !== key || Date.now() - cards.at > FRESH_MS) {
        cards = load(folder, from, key, kindLabel);
      }
      return cards.items.then(
        (items) => ({ items, complete: true as const }),
        () => null,
      );
    },
  });
}
