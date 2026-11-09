import { useCallback, useEffect, useState } from "react";
import type { SidebarTabProps } from "../../app/sidebar-tabs";
import { useSettings } from "../../prefs/SettingsContext";
import { fs } from "../../platform/ipc";
import { showMessage, showPrompt } from "../../ui/app-dialog";
import { MarkdownFileIcon, PlusIcon } from "../../ui/icons";
import { Tooltip } from "../../ui/Tooltip";
import { absoluteChapterPath } from "../novel-project";
import { MATERIALS_DIR, listMaterials } from "../materials";
import type { Material } from "../materials";
import "./novel-panel.css";

/**
 * The research: the notes and attachments under the project's `materials/`
 * folder. Notes are ordinary documents, so they open and edit like any
 * chapter; attachments open in whatever the app shows them with, and the
 * notes link to them.
 */
export function MaterialsPanel({ openFolder, onOpenFile }: SidebarTabProps) {
  const { t } = useSettings();
  const root = openFolder.folder;
  const [items, setItems] = useState<readonly Material[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!root) {
      setItems([]);
      return;
    }
    setLoading(true);
    setItems(await listMaterials(root));
    setLoading(false);
  }, [root]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!root) {
    return <div className="clipboard-empty">{t.materialsNoFolder}</div>;
  }

  const create = async () => {
    const name = await showPrompt(t.materialsNew, "", {
      okLabel: t.manuscriptAdd,
      cancelLabel: t.cancel,
    });
    if (!name?.trim()) return;
    try {
      const path = await fs.createDocument(
        absoluteChapterPath(root, MATERIALS_DIR),
        name.trim(),
      );
      await reload();
      onOpenFile(path);
    } catch (err) {
      void showMessage(String(err));
    }
  };

  return (
    <div className="file-tree novel-panel">
      <div className="novel-head">
        <span className="novel-title">{t.materialsTab}</span>
        <span className="novel-count">{items.length}</span>
      </div>
      <div className="tree-toolbar">
        <Tooltip text={t.materialsNew}>
          <button
            type="button"
            className="tree-tool"
            aria-label={t.materialsNew}
            onClick={() => void create()}
          >
            <PlusIcon />
          </button>
        </Tooltip>
      </div>

      {items.length === 0 && !loading ? (
        <div className="clipboard-empty">{t.materialsEmpty}</div>
      ) : (
        items.map((item) => (
          <div
            key={item.path}
            className="tree-row"
            role="treeitem"
            tabIndex={0}
            onClick={() => onOpenFile(absoluteChapterPath(root, item.path))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onOpenFile(absoluteChapterPath(root, item.path));
              }
            }}
          >
            {/* An attachment keeps its extension, which is how a reader
                tells it from a note at a glance. */}
            <MarkdownFileIcon className="tree-icon" />
            <span className="tree-label">{item.title}</span>
          </div>
        ))
      )}
    </div>
  );
}
