import { useSettings } from "../../prefs/SettingsContext";
import { showPrompt } from "../../ui/app-dialog";
import { PlusIcon } from "../../ui/icons";
import { absoluteChapterPath } from "../novel-project";
import {
  addStoryline,
  assignStoryline,
  chaptersByStoryline,
  removeStoryline,
} from "../story";
import { chapterTitle, newId } from "../types";
import type { BoardTabProps } from "./board-types";

/**
 * The threads: each storyline with the chapters that run in it, and a way to
 * move a chapter from one to another. A chapter is in at most one thread,
 * which is what makes "whose story is this chapter" answerable.
 */
export function StorylinesTab({
  root,
  project,
  story,
  update,
  onOpenFile,
}: BoardTabProps) {
  const { t } = useSettings();
  const groups = chaptersByStoryline(story, project);
  const chapterOf = (id: string) =>
    project.chapters.find((chapter) => chapter.id === id);

  const add = async () => {
    const title = await showPrompt(t.boardNewStoryline, "", {
      okLabel: t.manuscriptAdd,
      cancelLabel: t.cancel,
    });
    if (!title?.trim()) return;
    update((current) =>
      addStoryline(current, newId(project, Date.now()), title.trim()),
    );
  };

  const rename = async (id: string, current: string) => {
    const title = await showPrompt(t.boardStorylineName, current, {
      okLabel: t.manuscriptRenameOk,
      cancelLabel: t.cancel,
    });
    if (title === null || !title.trim()) return;
    update((storyNow) => ({
      ...storyNow,
      storylines: storyNow.storylines.map((line) =>
        line.id === id ? { ...line, title: title.trim() } : line,
      ),
    }));
  };

  if (project.chapters.length === 0) {
    return <div className="board-empty">{t.boardNoChapters}</div>;
  }

  return (
    <div className="board-tab">
      <div className="board-bar">
        <button type="button" className="board-add" onClick={() => void add()}>
          <PlusIcon />
          <span>{t.boardNewStoryline}</span>
        </button>
      </div>

      {groups.map((group) => {
        const line = story.storylines.find(
          (candidate) => candidate.id === group.storylineId,
        );
        if (!line && group.storylineId !== null) return null;
        // The unassigned group is only worth a section when it has someone.
        if (group.storylineId === null && group.chapterIds.length === 0) {
          return null;
        }
        return (
          <section
            key={group.storylineId ?? "none"}
            className="board-section"
            aria-label={line?.title ?? t.boardUnassigned}
          >
            <header className="board-section-head">
              <span className="board-section-title">
                {line?.title ?? t.boardUnassigned}
              </span>
              <span className="board-section-count">
                {group.chapterIds.length}
              </span>
              {line && (
                <span className="board-section-tools">
                  <button
                    type="button"
                    className="board-link"
                    onClick={() => void rename(line.id, line.title)}
                  >
                    {t.manuscriptRenameOk}
                  </button>
                  <button
                    type="button"
                    className="board-link"
                    onClick={() =>
                      update((current) => removeStoryline(current, line.id))
                    }
                  >
                    {t.boardRemoveStoryline}
                  </button>
                </span>
              )}
            </header>
            {group.chapterIds.map((id) => {
              const chapter = chapterOf(id);
              if (!chapter) return null;
              return (
                <div key={id} className="board-row">
                  <button
                    type="button"
                    className="board-row-title"
                    onClick={() =>
                      onOpenFile(absoluteChapterPath(root, chapter.path))
                    }
                  >
                    {chapterTitle(chapter)}
                  </button>
                  <select
                    className="board-select"
                    aria-label={t.boardStorylines}
                    value={story.storylineOf[id] ?? ""}
                    onChange={(e) =>
                      update((current) =>
                        assignStoryline(current, id, e.target.value || null),
                      )
                    }
                  >
                    <option value="">{t.boardUnassigned}</option>
                    {story.storylines.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {group.chapterIds.length === 0 && (
              <div className="board-note">{t.boardEmptyStoryline}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
