import { useMemo, useState } from "react";
import type { SidebarTabProps } from "../../app/sidebar-tabs";
import { useSettings } from "../../prefs/SettingsContext";
import { fs } from "../../platform/ipc";
import { showMessage, showPrompt } from "../../ui/app-dialog";
import { ContextMenu } from "../../ui/ContextMenu";
import type { ContextMenuEntry } from "../../ui/ContextMenu";
import { Presence } from "../../ui/usePresence";
import {
  ChevronIcon,
  MarkdownFileIcon,
  MoreIcon,
  PlusIcon,
} from "../../ui/icons";
import { Tooltip } from "../../ui/Tooltip";
import { openBoard } from "../board-store";
import { useNovelProject } from "../useNovelProject";
import { absoluteChapterPath } from "../novel-project";
import { groupChapters, renameChapter, setChapterAct } from "../chapters";
import type { ChapterGroup } from "../chapters";
import { chapterTitle, newId } from "../types";
import "./novel-panel.css";
import "./ManuscriptPanel.css";

/** A chapter's length, or the book's, as the language writes numbers. */
function formatCount(n: number, language: string): string {
  try {
    return new Intl.NumberFormat(language).format(n);
  } catch {
    return String(n);
  }
}

/** The folder's own name, for a book the author hasn't titled. */
function folderName(root: string): string {
  const parts = root.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? root;
}

/**
 * The manuscript: the book's volumes and their chapters, each with its
 * length, over the Markdown documents the folder already holds. Choosing a
 * chapter opens that document; everything else here is the order.
 */
export function ManuscriptPanel({
  openFolder,
  activePath,
  onOpenFile,
}: SidebarTabProps) {
  const { t, settings } = useSettings();
  const root = openFolder.folder;
  const novel = useNovelProject(root);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const [chapterMenu, setChapterMenu] = useState<{
    x: number;
    y: number;
    chapterId: string;
  } | null>(null);
  const [toolsMenu, setToolsMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const groups = useMemo(() => groupChapters(novel.project), [novel.project]);
  const language = settings.language;

  if (!root) {
    return <div className="clipboard-empty">{t.manuscriptNoFolder}</div>;
  }

  const openChapter = (path: string) => {
    if (novel.missing.has(path)) {
      void showMessage(t.manuscriptMissing);
      return;
    }
    onOpenFile(absoluteChapterPath(root, path));
  };

  const toggle = (key: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const newChapter = async () => {
    const name = await showPrompt(t.manuscriptNewChapter, "", {
      okLabel: t.manuscriptAdd,
      cancelLabel: t.cancel,
    });
    if (!name?.trim()) return;
    try {
      const path = await fs.createDocument(root, name.trim());
      await novel.syncFromDisk();
      onOpenFile(path);
    } catch (err) {
      // The backend refuses a taken name; say why rather than do nothing.
      void showMessage(String(err));
    }
  };

  const newAct = async () => {
    const title = await showPrompt(t.manuscriptNewAct, "", {
      okLabel: t.manuscriptAdd,
      cancelLabel: t.cancel,
    });
    if (!title?.trim()) return;
    novel.update((project) => ({
      ...project,
      acts: [
        ...project.acts,
        { id: newId(project, Date.now()), title: title.trim() },
      ],
    }));
  };

  const rename = async (chapterId: string, current: string) => {
    const title = await showPrompt(t.manuscriptRename, current, {
      okLabel: t.manuscriptRenameOk,
      cancelLabel: t.cancel,
    });
    if (title === null) return;
    novel.update((project) => renameChapter(project, chapterId, title.trim()));
  };

  const chapterItems = (chapterId: string): ContextMenuEntry[] => {
    const chapter = novel.project.chapters.find((c) => c.id === chapterId);
    if (!chapter) return [];
    return [
      {
        label: t.manuscriptRename,
        onSelect: () => void rename(chapterId, chapterTitle(chapter)),
      },
      {
        label: t.manuscriptMoveTo,
        items: [
          {
            label: t.manuscriptUnassigned,
            checked: chapter.actId === null,
            onSelect: () =>
              novel.update((project) =>
                setChapterAct(project, chapterId, null),
              ),
          },
          ...novel.project.acts.map((act) => ({
            label: act.title,
            checked: chapter.actId === act.id,
            onSelect: () =>
              novel.update((project) =>
                setChapterAct(project, chapterId, act.id),
              ),
          })),
        ],
      },
    ];
  };

  const goal = novel.project.goals.totalWords;
  const total = formatCount(novel.totalWords, language);
  // The count speaks for itself; the aim, when there is one, rides beside it
  // and says where the book stands.
  const words =
    goal > 0
      ? `${total} 路 ${t.manuscriptGoal
          .replace("{of}", formatCount(goal, language))
          .replace(
            "{pct}",
            String(Math.round((novel.totalWords / goal) * 100)),
          )}`
      : total;

  return (
    <div className="file-tree novel-panel manuscript">
      <div className="novel-head">
        <span className="novel-title">
          {novel.project.title.trim() || folderName(root)}
        </span>
        <span
          className="novel-count manuscript-words"
          title={t.manuscriptWordsLabel}
        >
          {words}
        </span>
      </div>

      <div className="tree-toolbar">
        <Tooltip text={t.manuscriptNewChapter}>
          <button
            type="button"
            className="tree-tool"
            onClick={() => void newChapter()}
            aria-label={t.manuscriptNewChapter}
          >
            <PlusIcon />
          </button>
        </Tooltip>
        <span className="novel-spacer" />
        <Tooltip text={t.manuscriptMore}>
          <button
            type="button"
            className="tree-tool"
            aria-label={t.manuscriptMore}
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              setToolsMenu({ x: box.left, y: box.bottom });
            }}
          >
            <MoreIcon />
          </button>
        </Tooltip>
      </div>

      {groups.length === 0 ? (
        <div className="clipboard-empty">{t.manuscriptEmpty}</div>
      ) : (
        groups.map((group: ChapterGroup) => {
          const key = group.act?.id ?? "";
          const isFolded = folded.has(key);
          return (
            <div key={key || "unassigned"} className="novel-group">
              {group.act !== null && (
                <div
                  className="novel-group-head"
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isFolded}
                  onClick={() => toggle(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(key);
                    }
                  }}
                >
                  <ChevronIcon
                    className={`chevron ${isFolded ? "" : "chevron-open"}`}
                  />
                  <span className="tree-label">{group.act.title}</span>
                </div>
              )}
              {!isFolded &&
                group.chapters.map((chapter) => {
                  const path = absoluteChapterPath(root, chapter.path);
                  const missing = novel.missing.has(chapter.path);
                  return (
                    <div
                      key={chapter.id}
                      className={`tree-row manuscript-chapter${
                        activePath === path ? " tree-row-active" : ""
                      }${missing ? " is-missing" : ""}`}
                      role="treeitem"
                      tabIndex={0}
                      onClick={() => openChapter(chapter.path)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openChapter(chapter.path);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setChapterMenu({
                          x: e.clientX,
                          y: e.clientY,
                          chapterId: chapter.id,
                        });
                      }}
                    >
                      <MarkdownFileIcon className="tree-icon manuscript-icon" />
                      <span className="tree-label">
                        {chapterTitle(chapter)}
                      </span>
                      <span className="novel-count">
                        {formatCount(
                          novel.wordsByChapter.get(chapter.id) ?? 0,
                          language,
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          );
        })
      )}

      <Presence show={chapterMenu !== null} exitMs={120}>
        {chapterMenu && (
          <ContextMenu
            x={chapterMenu.x}
            y={chapterMenu.y}
            items={chapterItems(chapterMenu.chapterId)}
            onClose={() => setChapterMenu(null)}
          />
        )}
      </Presence>
      <Presence show={toolsMenu !== null} exitMs={120}>
        {toolsMenu && (
          <ContextMenu
            x={toolsMenu.x}
            y={toolsMenu.y}
            items={[
              { label: t.boardTitle, onSelect: openBoard },
              { label: t.manuscriptNewAct, onSelect: () => void newAct() },
              {
                label: t.manuscriptSync,
                onSelect: () => void novel.syncFromDisk(),
              },
            ]}
            onClose={() => setToolsMenu(null)}
          />
        )}
      </Presence>
    </div>
  );
}
