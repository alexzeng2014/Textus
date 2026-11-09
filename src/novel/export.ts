/** The whole book as one Markdown document, in manuscript order: the form
 *  an editor, a beta reader or a conversion tool wants, and the one thing
 *  every writer eventually asks for. */

export interface BookChapter {
  title: string;
  /** The volume it runs in, or null for one before the first. */
  actTitle: string | null;
  text: string;
}

/** `title`'s book: a heading for it, a heading per volume, a heading per
 *  chapter above its prose. Chapters keep their own headings as written -
 *  this adds none of its own to the prose itself. */
export function bookMarkdown(
  title: string,
  chapters: readonly BookChapter[],
): string {
  const parts: string[] = [];
  const name = title.trim();
  if (name) parts.push(`# ${name}`);
  let act: string | null | undefined;
  for (const chapter of chapters) {
    // A new volume gets its heading; chapters before the first have none.
    if (chapter.actTitle !== act) {
      act = chapter.actTitle;
      if (act) parts.push(`## ${act}`);
    }
    parts.push(`### ${chapter.title.trim() || "Untitled"}`);
    const body = chapter.text.replace(/\s+$/, "");
    if (body.trim()) parts.push(body);
  }
  return parts.join("\n\n") + "\n";
}
