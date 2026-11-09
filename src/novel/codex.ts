/** The codex: who and what the book is about, one Markdown document each,
 *  under `.textus/novel/codex/<kind>/`. The document is the card - its
 *  front matter names it, its body is the author's free description - so
 *  the whole codex stays readable and editable outside the app. */

import {
  joinFrontMatter,
  listField,
  setListField,
  splitFrontMatter,
} from "./front-matter";

export const CODEX_KINDS = ["character", "place", "object", "lore"] as const;

export type CodexKind = (typeof CODEX_KINDS)[number];

/** Where the codex lives, relative to the project root. */
export const CODEX_DIR = ".textus/novel/codex";

/** One entry: a person, a place, a thing, or a piece of the world. */
export interface CodexCard {
  kind: CodexKind;
  /** The file's name without its extension, and the card's identity. */
  slug: string;
  /** Relative to the project root, `/`-separated. */
  path: string;
  title: string;
  /** Other names the prose may use for it. */
  aliases: string[];
  /** The author's own heading for it, free text: a faction, a city. */
  group: string;
  body: string;
}

export function isCodexKind(value: unknown): value is CodexKind {
  return CODEX_KINDS.includes(value as CodexKind);
}

/** The folder a kind's cards live in, relative to the project root. */
export const codexKindDir = (kind: CodexKind): string => `${CODEX_DIR}/${kind}`;

/** A card's path, relative to the project root. */
export const codexCardPath = (kind: CodexKind, slug: string): string =>
  `${codexKindDir(kind)}/${slug}.md`;

const CARD_PATH = /^\.textus\/novel\/codex\/([a-z]+)\/([^/]+)\.md$/;

/** The kind and slug a path names, or null for a file that isn't a card. */
export function parseCardPath(
  path: string,
): { kind: CodexKind; slug: string } | null {
  const match = CARD_PATH.exec(path);
  if (!match || !isCodexKind(match[1])) return null;
  return { kind: match[1], slug: match[2] };
}

/** A name a file can have: lower-case words joined by dashes, with the
 *  script's own letters kept so a Chinese name stays readable. */
export function slugFromTitle(title: string): string {
  const slug = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "card";
}

/** The first slug from `title` that isn't in `taken`: a second "李四" gets
 *  "li-si-2" rather than replacing the first. */
export function uniqueSlug(title: string, taken: ReadonlySet<string>): string {
  const base = slugFromTitle(title);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const next = `${base}-${n}`;
    if (!taken.has(next)) return next;
  }
}

/** The card a document holds; null when the path isn't a card's. */
export function cardFromMarkdown(
  path: string,
  markdown: string,
): CodexCard | null {
  const parsed = parseCardPath(path);
  if (!parsed) return null;
  const { fields, body } = splitFrontMatter(markdown);
  return {
    kind: parsed.kind,
    slug: parsed.slug,
    path,
    title: fields.title?.trim() || parsed.slug.replace(/-/g, " "),
    aliases: listField(fields, "aliases"),
    group: fields.group?.trim() ?? "",
    body,
  };
}

/** The document a card is written as. Only the fields that say something
 *  are written, so a plain card stays a plain document. */
export function cardToMarkdown(card: CodexCard): string {
  let fields: Record<string, string> = { title: card.title };
  if (card.group) fields.group = card.group;
  fields = setListField(fields, "aliases", card.aliases);
  return joinFrontMatter(fields, card.body);
}

/** The cards of one kind, by title, in the language's own order. */
export function cardsOfKind(
  cards: readonly CodexCard[],
  kind: CodexKind,
): CodexCard[] {
  return cards
    .filter((card) => card.kind === kind)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** However the author would look for it: by any of its names, or by the
 *  heading it sits under. */
export function matchesCard(card: CodexCard, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    card.title.toLowerCase().includes(needle) ||
    card.group.toLowerCase().includes(needle) ||
    card.aliases.some((alias) => alias.toLowerCase().includes(needle))
  );
}
