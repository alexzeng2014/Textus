import { useEffect, useState } from "react";
import { useSettings } from "../../prefs/SettingsContext";
import { CloseIcon } from "../../ui/icons";
import { Presence } from "../../ui/usePresence";
import { closeBoard, useBoardOpen } from "../board-store";
import { useNovelProject } from "../useNovelProject";
import { useStory } from "../useStory";
import { PlotGridTab } from "./PlotGridTab";
import { StorylinesTab } from "./StorylinesTab";
import { TimelineTab } from "./TimelineTab";
import "./board.css";

type BoardTab = "storylines" | "timeline" | "plot";

/** The board over the window. Its contents load only while it is open: a
 *  window that never opens it reads no chapters. */
export function BoardLayer({
  root,
  onOpenFile,
}: {
  root: string | null;
  onOpenFile: (path: string) => void;
}) {
  const open = useBoardOpen();
  return (
    <Presence show={open} exitMs={220}>
      {open && <Board root={root} onOpenFile={onOpenFile} />}
    </Presence>
  );
}

function Board({
  root,
  onOpenFile,
}: {
  root: string | null;
  onOpenFile: (path: string) => void;
}) {
  const { t } = useSettings();
  const novel = useNovelProject(root);
  const { story, update } = useStory(root);
  const [tab, setTab] = useState<BoardTab>("storylines");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeBoard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs: { id: BoardTab; label: string }[] = [
    { id: "storylines", label: t.boardStorylines },
    { id: "timeline", label: t.boardTimeline },
    { id: "plot", label: t.boardPlot },
  ];
  const shared = {
    root: root ?? "",
    project: novel.project,
    story,
    update,
    onOpenFile,
  };

  return (
    <div
      className="novel-board"
      role="dialog"
      aria-modal="true"
      aria-label={t.boardTitle}
    >
      <header className="novel-board-head">
        <span className="novel-board-title">{t.boardTitle}</span>
        <nav className="novel-board-tabs" aria-label={t.boardTitle}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`novel-board-tab${tab === id ? " is-current" : ""}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="board-icon-button"
          aria-label={t.boardClose}
          onClick={closeBoard}
        >
          <CloseIcon />
        </button>
      </header>

      <div className="novel-board-body">
        {root === null ? (
          <div className="board-empty">{t.boardNoFolder}</div>
        ) : novel.loading ? (
          <div className="board-empty">{t.boardLoading}</div>
        ) : tab === "storylines" ? (
          <StorylinesTab {...shared} />
        ) : tab === "timeline" ? (
          <TimelineTab {...shared} />
        ) : (
          <PlotGridTab {...shared} />
        )}
      </div>
    </div>
  );
}
