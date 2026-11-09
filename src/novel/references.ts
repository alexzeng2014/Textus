/** Which chapters mention a card. A mention is a link to the card's
 *  document, and `@` writes the card's path out in full precisely so this
 *  can be answered by reading the prose - no index to keep in step, and a
 *  hand-written link counts the same as one the panel inserted. */

import type { CodexCard } from "./codex";

/** A document of the folder and its text, as `fs.folderDocuments` gives it. */
export interface FolderDocument {
  /** Absolute. */
  path: string;
  /** From the project root, `/`-separated. */
  rel: string;
  text: string;
}

/** What a link to the card contains: its path without the extension, which
 *  both `[[codex/character/li-si|李四]]` and `[李四](codex/character/li-si.md)`
 *  carry. */
export function cardLinkNeedle(card: CodexCard): string {
  return card.path.replace(/\.md$/i, "");
}

/** Whether `text` links to the card. */
export function mentionsCard(text: string, card: CodexCard): boolean {
  return text.toLowerCase().includes(cardLinkNeedle(card).toLowerCase());
}

/** The documents that link to `card`, in the order given. The card's own
 *  document isn't a reference to itself, however it is written. */
export function documentsMentioning(
  documents: readonly FolderDocument[],
  card: CodexCard,
): FolderDocument[] {
  return documents.filter(
    (document) =>
      document.rel !== card.path && mentionsCard(document.text, card),
  );
}
