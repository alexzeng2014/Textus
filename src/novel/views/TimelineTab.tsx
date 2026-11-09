import { useSettings } from "../../prefs/SettingsContext";
import { ArrowUpIcon } from "../../ui/icons";
import { absoluteChapterPath } from "../novel-project";
import { moveInList, narrativeOrderOf } from "../story";
import { chapterTitle } from "../types";
import type { BoardTabProps } from "./board-types";

/**
 * The story in the order it happens, which a flashback makes differ from
 * the order it is read in. Moving a chapter here changes nothing about the
 * manuscript: the two orders are kept apart on purpose.
 */
export function TimelineTab({
  root,
  project,
  story,
  update,
  onOpenFile,
}: BoardTabProps) {
  const { t } = useSettings();
  const order = narrativeOrderOf(story, project);

  const move = (id: string, to: number) =>
    update((current) => ({
      ...current,
      narrativeOrder: moveInList(order, id, to),
    }));

  if (order.length === 0) {
    return <div className="board-empty">{t.boardNoChapters}</div>;
  }

  return (
    <div className="board-tab">
      <p className="board-hint">{t.boardTimelineHint}</p>
      <ol className="board-order">
        {order.map((id, index) => {
          const chapter = project.chapters.find(
            (candidate) => candidate.id === id,
          );
          if (!chapter) return null;
          return (
            <li key={id} className="board-order-row">
              <span className="board-order-index">{index + 1}</span>
              <button
                type="button"
                className="board-row-title"
                onClick={() =>
                  onOpenFile(absoluteChapterPath(root, chapter.path))
                }
              >
                {chapterTitle(chapter)}
              </button>
              <span className="board-order-tools">
                <button
                  type="button"
                  className="board-icon-button"
                  aria-label={t.boardMoveUp}
                  disabled={index === 0}
                  onClick={() => move(id, index - 1)}
                >
                  <ArrowUpIcon />
                </button>
                <button
                  type="button"
                  className="board-icon-button"
                  aria-label={t.boardMoveDown}
                  disabled={index === order.length - 1}
                  onClick={() => move(id, index + 1)}
                >
                  <ArrowUpIcon className="board-flip" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
