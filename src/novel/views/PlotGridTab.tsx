import { Fragment, useState } from "react";
import { useSettings } from "../../prefs/SettingsContext";
import { CloseIcon, PlusIcon } from "../../ui/icons";
import {
  addPlotColumn,
  addPlotRow,
  cellText,
  plotOf,
  removePlotColumn,
  removePlotRow,
  setCell,
  setPlotHeading,
  withPlot,
} from "../story";
import type { PlotGrid } from "../story";
import { chapterTitle } from "../types";
import type { BoardTabProps } from "./board-types";
import "./PlotGridTab.css";

/**
 * One chapter's plot grid: what happens in each scene along each thread of
 * the plot. The author names both axes; the cells hold the story.
 */
export function PlotGridTab({ project, story, update }: BoardTabProps) {
  const { t } = useSettings();
  const [picked, setPicked] = useState<string | null>(null);
  const chapter =
    project.chapters.find((candidate) => candidate.id === picked) ??
    project.chapters[0];

  if (!chapter) {
    return <div className="board-empty">{t.boardNoChapters}</div>;
  }

  const grid = plotOf(story, chapter.id);
  const save = (next: PlotGrid) =>
    update((current) => withPlot(current, chapter.id, next));

  return (
    <div className="board-tab">
      <div className="board-bar">
        <select
          className="board-select"
          aria-label={t.boardChapter}
          value={chapter.id}
          onChange={(e) => setPicked(e.target.value)}
        >
          {project.chapters.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {chapterTitle(candidate)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="board-add"
          onClick={() => save(addPlotColumn(grid))}
        >
          <PlusIcon />
          <span>{t.boardAddColumn}</span>
        </button>
        <button
          type="button"
          className="board-add"
          onClick={() => save(addPlotRow(grid))}
        >
          <PlusIcon />
          <span>{t.boardAddRow}</span>
        </button>
      </div>

      {grid.columns.length === 0 || grid.rows.length === 0 ? (
        <div className="board-empty">{t.boardEmptyGrid}</div>
      ) : (
        <div
          className="plot-grid"
          style={{
            gridTemplateColumns: `minmax(120px, 8rem) repeat(${grid.columns.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="plot-corner" />
          {grid.columns.map((heading, column) => (
            <div key={`head-${column}`} className="plot-head">
              <input
                className="plot-heading"
                value={heading}
                aria-label={t.boardHeading}
                placeholder={t.boardHeading}
                onChange={(e) =>
                  save(setPlotHeading(grid, "column", column, e.target.value))
                }
              />
              <button
                type="button"
                className="plot-remove"
                aria-label={t.boardRemove}
                onClick={() => save(removePlotColumn(grid, column))}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {grid.rows.map((heading, row) => (
            <Fragment key={`row-${row}`}>
              <div className="plot-head">
                <input
                  className="plot-heading"
                  value={heading}
                  aria-label={t.boardHeading}
                  placeholder={t.boardHeading}
                  onChange={(e) =>
                    save(setPlotHeading(grid, "row", row, e.target.value))
                  }
                />
                <button
                  type="button"
                  className="plot-remove"
                  aria-label={t.boardRemove}
                  onClick={() => save(removePlotRow(grid, row))}
                >
                  <CloseIcon />
                </button>
              </div>
              {grid.columns.map((_, column) => (
                <textarea
                  key={`cell-${row}-${column}`}
                  className="plot-cell"
                  rows={2}
                  aria-label={t.boardPlotCell}
                  value={cellText(grid, row, column)}
                  onChange={(e) =>
                    save(setCell(grid, row, column, e.target.value))
                  }
                />
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
