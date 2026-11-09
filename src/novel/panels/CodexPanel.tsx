import { useState } from "react";
import type { SidebarTabProps } from "../../app/sidebar-tabs";
import { useSettings } from "../../prefs/SettingsContext";
import { fs } from "../../platform/ipc";
import { showMessage, showPrompt } from "../../ui/app-dialog";
import { ContextMenu } from "../../ui/ContextMenu";
import { Presence } from "../../ui/usePresence";
import { ChevronIcon, PlusIcon, SearchIcon } from "../../ui/icons";
import { Tooltip } from "../../ui/Tooltip";
import { CODEX_KINDS, cardsOfKind, matchesCard } from "../codex";
import type { CodexCard, CodexKind } from "../codex";
import { absoluteChapterPath } from "../novel-project";
import { documentsMentioning } from "../references";
import type { ContextMenuEntry } from "../../ui/ContextMenu";
import { useCodex } from "../useCodex";
import "./novel-panel.css";
import "./CodexPanel.css";

/** The heading each kind is drawn under. Named one by one rather than as
 *  `keyof Strings`: the strings include counted forms, and a heading is
 *  never one of those. */
type KindLabelKey =
  "codexKindCharacter" | "codexKindPlace" | "codexKindObject" | "codexKindLore";

const KIND_LABEL: Record<CodexKind, KindLabelKey> = {
  character: "codexKindCharacter",
  place: "codexKindPlace",
  object: "codexKindObject",
  lore: "codexKindLore",
};

/**
 * The codex: everyone and everything the book is about, as the Markdown
 * cards under `.textus/novel/codex/`. Choosing one opens its document,
 * where the author writes; the panel makes them, names them and finds them.
 */
export function CodexPanel({ openFolder, onOpenFile }: SidebarTabProps) {
  const { t } = useSettings();
  const root = openFolder.folder;
  const codex = useCodex(root);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [cardMenu, setCardMenu] = useState<{
    x: number;
    y: number;
    card: CodexCard;
  } | null>(null);
  /** The chapters that link to a card, listed where the card was. */
  const [refsMenu, setRefsMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuEntry[];
  } | null>(null);

  if (!root) {
    return <div className="clipboard-empty">{t.codexNoFolder}</div>;
  }

  const shown = codex.cards.filter((card) => matchesCard(card, query));
  const groups = CODEX_KINDS.map((kind) => ({
    kind,
    cards: cardsOfKind(shown, kind),
  })).filter((group) => group.cards.length > 0);

  const open = (card: CodexCard) =>
    onOpenFile(absoluteChapterPath(root, card.path));

  const create = async (kind: CodexKind) => {
    const title = await showPrompt(t.codexNewTitle, "", {
      okLabel: t.manuscriptAdd,
      cancelLabel: t.cancel,
    });
    if (!title?.trim()) return;
    const card = await codex.createCard(kind, title.trim());
    if (card) open(card);
  };

  const rename = async (card: CodexCard) => {
    const title = await showPrompt(t.codexRename, card.title, {
      okLabel: t.codexRenameOk,
      cancelLabel: t.cancel,
    });
    if (title === null || !title.trim()) return;
    await codex.setCardFields(card, { title: title.trim() });
  };

  /** Which chapters link to a card, read from the prose rather than from an
   *  index: every document of the folder is looked at, so a mention written
   *  by hand counts the same as one the `@` list inserted. */
  const findReferences = async (card: CodexCard, x: number, y: number) => {
    let documents;
    try {
      ({ documents } = await fs.folderDocuments(root));
    } catch {
      void showMessage(t.codexNoReferences);
      return;
    }
    const found = documentsMentioning(documents, card);
    if (found.length === 0) {
      void showMessage(t.codexNoReferences);
      return;
    }
    setRefsMenu({
      x,
      y,
      items: found.slice(0, 30).map((document) => ({
        label: document.rel.replace(/\.md$/i, ""),
        onSelect: () => onOpenFile(document.path),
      })),
    });
  };

  const toggle = (key: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div className="file-tree novel-panel codex">
      <div className="novel-head">
        <span className="novel-title">{t.codexTab}</span>
        <span className="novel-count">{codex.cards.length}</span>
      </div>

      <div className="tree-toolbar">
        <label className="codex-search">
          <SearchIcon className="codex-search-icon" />
          <input
            type="search"
            value={query}
            placeholder={t.codexSearch}
            aria-label={t.codexSearch}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Tooltip text={t.codexNew}>
          <button
            type="button"
            className="tree-tool"
            aria-label={t.codexNew}
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              setMenu({ x: box.left, y: box.bottom });
            }}
          >
            <PlusIcon />
          </button>
        </Tooltip>
      </div>

      {codex.cards.length === 0 ? (
        <div className="clipboard-empty">{t.codexEmpty}</div>
      ) : groups.length === 0 ? (
        <div className="clipboard-empty">{t.codexNoMatches}</div>
      ) : (
        groups.map((group) => {
          const key = group.kind;
          const isFolded = folded.has(key);
          return (
            <div key={key} className="novel-group">
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
                <span className="tree-label">{t[KIND_LABEL[group.kind]]}</span>
                <span className="novel-group-count">{group.cards.length}</span>
              </div>
              {!isFolded &&
                group.cards.map((card) => (
                  <div
                    key={card.path}
                    className="tree-row codex-card"
                    role="treeitem"
                    tabIndex={0}
                    onClick={() => open(card)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") open(card);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCardMenu({
                        x: e.clientX,
                        y: e.clientY,
                        card,
                      });
                    }}
                  >
                    <span className="tree-label">{card.title}</span>
                    {card.group && (
                      <span className="codex-sub">{card.group}</span>
                    )}
                  </div>
                ))}
            </div>
          );
        })
      )}

      <Presence show={menu !== null} exitMs={120}>
        {menu && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={CODEX_KINDS.map((kind) => ({
              label: t[KIND_LABEL[kind]],
              onSelect: () => void create(kind),
            }))}
            onClose={() => setMenu(null)}
          />
        )}
      </Presence>
      <Presence show={cardMenu !== null} exitMs={120}>
        {cardMenu && (
          <ContextMenu
            x={cardMenu.x}
            y={cardMenu.y}
            items={[
              { label: t.codexOpen, onSelect: () => open(cardMenu.card) },
              {
                label: t.codexReferences,
                onSelect: () =>
                  void findReferences(
                    cardMenu.card,
                    cardMenu.x + 12,
                    cardMenu.y + 8,
                  ),
              },
              {
                label: t.codexRename,
                onSelect: () => void rename(cardMenu.card),
              },
            ]}
            onClose={() => setCardMenu(null)}
          />
        )}
      </Presence>
      <Presence show={refsMenu !== null} exitMs={120}>
        {refsMenu && (
          <ContextMenu
            x={refsMenu.x}
            y={refsMenu.y}
            items={refsMenu.items}
            onClose={() => setRefsMenu(null)}
          />
        )}
      </Presence>
    </div>
  );
}
