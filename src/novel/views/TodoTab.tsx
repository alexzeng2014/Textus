import { useEffect, useState } from "react";
import { useSettings } from "../../prefs/SettingsContext";
import { fs } from "../../platform/ipc";
import { absoluteChapterPath } from "../novel-project";
import { chapterTodos } from "../todos";
import type { NovelTodo, TodoKind } from "../todos";
import { chapterTitle } from "../types";
import type { BoardTabProps } from "./board-types";

/** What each kind of note is called beside a row. */
const KIND_LABEL: Record<TodoKind, string> = {
  todo: "TODO",
  fixme: "FIXME",
  note: "NOTE",
  task: "□",
};

/**
 * What the author left for later, gathered from the prose itself. The
 * documents stay the only place a note-to-self lives, so this list can be
 * trusted to match them; ticking a box or deleting the line is how one goes.
 */
export function TodoTab({ root, project, onOpenFile }: BoardTabProps) {
  const { t } = useSettings();
  const [todos, setTodos] = useState<readonly NovelTodo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void (async () => {
      setLoading(true);
      const chapters = await Promise.all(
        project.chapters.map(async (chapter) => {
          try {
            return {
              id: chapter.id,
              text: await fs.readTextFile(
                absoluteChapterPath(root, chapter.path),
              ),
            };
          } catch {
            return { id: chapter.id, text: "" };
          }
        }),
      );
      if (!live) return;
      setTodos(chapterTodos(chapters));
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [root, project]);

  if (loading) return <div className="board-empty">{t.boardLoading}</div>;
  if (todos.length === 0) {
    return <div className="board-empty">{t.todoEmpty}</div>;
  }

  return (
    <div className="board-tab">
      <p className="board-hint">{t.todoHint}</p>
      <ol className="board-order">
        {todos.map((todo) => {
          const chapter = project.chapters.find(
            (candidate) => candidate.id === todo.chapterId,
          );
          if (!chapter) return null;
          return (
            <li
              key={`${todo.chapterId}:${todo.line}`}
              className="board-order-row"
            >
              <span className={`todo-kind todo-${todo.kind}`}>
                {KIND_LABEL[todo.kind]}
              </span>
              <button
                type="button"
                className="board-row-title"
                onClick={() =>
                  onOpenFile(absoluteChapterPath(root, chapter.path))
                }
              >
                {todo.text}
              </button>
              <span className="todo-where">
                {chapterTitle(chapter)} · {todo.line}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
