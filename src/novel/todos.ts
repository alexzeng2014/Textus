/** What the author left for later, found in the prose itself: a `TODO:`
 *  line, or a task list item not yet ticked. Read, never written - the
 *  document stays the only place a note-to-self lives, so the list can't
 *  drift out of step with it. */

export type TodoKind = "todo" | "fixme" | "note" | "task";

export interface NovelTodo {
  /** The chapter it was found in. */
  chapterId: string;
  /** 1-based, as an editor counts lines. */
  line: number;
  kind: TodoKind;
  text: string;
}

/** A list item still to do: `- [ ] something`. */
const OPEN_TASK = /^\s*(?:[-*+]|\d+[.)])\s+\[\s?\]\s+(.*)$/;
/** A ticked one, which is done and not a thing to do. */
const DONE_TASK = /^\s*(?:[-*+]|\d+[.)])\s+\[[xX]\]\s+/;
/** `TODO: …`, with or without a bullet. */
const MARKER = /^\s*(?:[-*+]|\d+[.)])?\s*(TODO|FIXME|NOTE)\b\s*:?\s*(.*)$/i;

const KIND_OF: Record<string, TodoKind> = {
  todo: "todo",
  fixme: "fixme",
  note: "note",
};

/** The todos in one document, in the order they appear. Fenced code is
 *  skipped: a `TODO` inside a code sample is not a note to the author. */
export function todosIn(markdown: string): Omit<NovelTodo, "chapterId">[] {
  const found: Omit<NovelTodo, "chapterId">[] = [];
  let inFence = false;
  const lines = markdown.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const open = OPEN_TASK.exec(line);
    if (open) {
      const text = open[1].trim();
      if (text) found.push({ line: index + 1, kind: "task", text });
      continue;
    }
    if (DONE_TASK.test(line)) continue;
    const marker = MARKER.exec(line);
    const text = marker?.[2].trim();
    if (marker && text) {
      found.push({
        line: index + 1,
        kind: KIND_OF[marker[1].toLowerCase()] ?? "todo",
        text,
      });
    }
  }
  return found;
}

/** Every chapter's todos, chapter by chapter in the order given. */
export function chapterTodos(
  chapters: readonly { id: string; text: string }[],
): NovelTodo[] {
  return chapters.flatMap((chapter) =>
    todosIn(chapter.text).map((todo) => ({ ...todo, chapterId: chapter.id })),
  );
}
