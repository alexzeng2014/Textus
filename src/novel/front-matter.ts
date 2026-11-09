/** The `---` block at the top of a card's document: flat `key: value`
 *  pairs, the same shape any Markdown tool writes. Deliberately not a YAML
 *  parser - a card names a title, a group and a list of aliases, and a
 *  hand-rolled subset that refuses to guess is easier to trust than one
 *  that quietly reads a typo as a nested map. Whatever isn't understood
 *  stays in the body, so nothing is lost by opening a card elsewhere. */

export interface FrontMatter {
  /** The pairs, in the order the file had them. */
  fields: Record<string, string>;
  /** Everything after the closing fence, or the whole text when there was
   *  no front matter at all. */
  body: string;
}

const FENCE = /^---[ \t]*$/;
const CLOSING = /^(---|\.\.\.)[ \t]*$/;
const PAIR = /^([A-Za-z0-9_-]+)[ \t]*:[ \t]*(.*)$/;

/** `---` at the very start (a BOM from another editor still counts). */
function opensFrontMatter(line: string): boolean {
  return FENCE.test(line.replace(/^\uFEFF/, "").trimEnd());
}

/** A value without the quotes it was written in. A quoted value keeps its
 *  colons and leading spaces; a bare one is trimmed. */
function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' || first === "'") && last === first) {
      const inner = value.slice(1, -1);
      return first === '"' ? inner.replace(/\\(["\\])/g, "$1") : inner;
    }
  }
  return value;
}

/** A value as the file writes it: quoted when it would otherwise read as
 *  something else (a colon, a leading dash, surrounding spaces). */
function quote(value: string): string {
  if (/^[A-Za-z0-9\u00C0-\uFFFF][^:\n]*$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Splits a document into its front matter and its body. Text that opens
 *  with `---` but never closes it is all body: an unfinished fence is a
 *  horizontal rule, not an error. */
export function splitFrontMatter(markdown: string): FrontMatter {
  const lines = markdown.split("\n");
  if (lines.length === 0 || !opensFrontMatter(lines[0])) {
    return { fields: {}, body: markdown };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (CLOSING.test(lines[i])) {
      close = i;
      break;
    }
  }
  if (close < 0) return { fields: {}, body: markdown };

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, close)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = PAIR.exec(line);
    // A line that indents is a nested shape this reader doesn't do; leaving
    // it out of the fields keeps it visible in the body below instead.
    if (!match || /^\s/.test(line)) continue;
    fields[match[1]] = unquote(match[2]);
  }
  // One blank line after the fence belongs to the fence, not the body.
  let rest = lines.slice(close + 1);
  if (rest.length > 0 && rest[0].trim() === "") rest = rest.slice(1);
  return { fields, body: rest.join("\n") };
}

/** A document with `fields` as its front matter, or the body alone when
 *  there are none: an empty fence is noise. */
export function joinFrontMatter(
  fields: Record<string, string>,
  body: string,
): string {
  const pairs = Object.entries(fields).filter(([, value]) => value !== "");
  if (pairs.length === 0) return body;
  const head = pairs.map(([key, value]) => `${key}: ${quote(value)}`);
  return ["---", ...head, "---", "", body].join("\n");
}

/** A comma-separated field as its values, without blanks. */
export function listField(
  fields: Record<string, string>,
  key: string,
): string[] {
  const raw = fields[key];
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** `values` as one comma-separated field. Values holding a comma would
 *  read back as two, so they keep the separator out. */
export function setListField(
  fields: Record<string, string>,
  key: string,
  values: readonly string[],
): Record<string, string> {
  const cleaned = values
    .map((value) => value.replace(/,/g, " ").trim())
    .filter(Boolean);
  const next = { ...fields };
  if (cleaned.length === 0) delete next[key];
  else next[key] = cleaned.join(", ");
  return next;
}
