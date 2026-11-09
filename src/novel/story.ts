/** How the book runs rather than how it is filed: the storylines its
 *  chapters belong to, the order the story itself happens in (which a
 *  flashback makes differ from the reading order), and the plot grid of
 *  each chapter.
 *
 *  Kept in `.textus/novel/story.json` - unlike the codex, none of this is a
 *  document of its own, so nothing links to it and it can stay out of the
 *  file tree. */

import type { NovelProject } from "./types";

export interface NovelStory {
  version: 1;
  /** The threads, in the order the panel shows them. */
  storylines: Storyline[];
  /** Chapter id to the storyline it runs in; a chapter is in at most one,
   *  as Drifting's primary storyline is. Absent means none. */
  storylineOf: Record<string, string>;
  /** Chapter ids in the order the story happens. */
  narrativeOrder: string[];
  /** Plot grids by chapter id. */
  plots: Record<string, PlotGrid>;
}

export interface Storyline {
  id: string;
  title: string;
}

/** One chapter's grid: what happens in each scene along each thread of the
 *  plot. Rows and columns are labelled by the author; cells are keyed by
 *  their indices, so a heading may be reworded without losing the text. */
export interface PlotGrid {
  /** Column headings, left to right. */
  columns: string[];
  /** Row headings, top to bottom. */
  rows: string[];
  /** "row:column" of the indices, to what is written there. */
  cells: Record<string, string>;
}

export function emptyStory(): NovelStory {
  return {
    version: 1,
    storylines: [],
    storylineOf: {},
    narrativeOrder: [],
    plots: {},
  };
}

/** The grid a chapter starts with: three threads and two scenes, unlabelled
 *  - the author names them, so no wording is baked in. */
export function emptyPlot(): PlotGrid {
  return { columns: ["", "", ""], rows: ["", ""], cells: {} };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const str = (value: unknown): string =>
  typeof value === "string" ? value : "";

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str) : [];

/** A story from whatever the file held: what isn't understood is dropped
 *  rather than rejected, so a hand-edited file still opens. */
export function normaliseStory(raw: unknown): NovelStory {
  if (!isRecord(raw)) return emptyStory();
  const storylines: Storyline[] = [];
  if (Array.isArray(raw.storylines)) {
    for (const entry of raw.storylines) {
      if (!isRecord(entry)) continue;
      const id = str(entry.id);
      if (!id || storylines.some((line) => line.id === id)) continue;
      storylines.push({ id, title: str(entry.title) || id });
    }
  }
  const known = new Set(storylines.map((line) => line.id));
  const storylineOf: Record<string, string> = {};
  if (isRecord(raw.storylineOf)) {
    for (const [chapterId, lineId] of Object.entries(raw.storylineOf)) {
      // A chapter pointing at a thread that isn't there runs in none.
      if (typeof lineId === "string" && known.has(lineId)) {
        storylineOf[chapterId] = lineId;
      }
    }
  }
  const narrativeOrder = [...new Set(strings(raw.narrativeOrder))];
  const plots: Record<string, PlotGrid> = {};
  if (isRecord(raw.plots)) {
    for (const [chapterId, grid] of Object.entries(raw.plots)) {
      if (isRecord(grid)) plots[chapterId] = normalisePlot(grid);
    }
  }
  return { version: 1, storylines, storylineOf, narrativeOrder, plots };
}

function normalisePlot(raw: Record<string, unknown>): PlotGrid {
  const columns = strings(raw.columns);
  const rows = strings(raw.rows);
  const cells: Record<string, string> = {};
  if (isRecord(raw.cells)) {
    for (const [key, value] of Object.entries(raw.cells)) {
      const [row, column] = key.split(":").map(Number);
      if (!Number.isInteger(row) || !Number.isInteger(column)) continue;
      // A cell outside the grid it belongs to is not drawn; dropping it
      // keeps the file from growing a shadow grid nobody can see.
      if (row < 0 || row >= rows.length) continue;
      if (column < 0 || column >= columns.length) continue;
      const text = str(value);
      if (text) cells[key] = text;
    }
  }
  return { columns, rows, cells };
}

/** Every chapter in story-time order: those the author has placed first, in
 *  their order, then any chapter placed nowhere yet, in the manuscript's
 *  own order - a new chapter shows up here without being dragged in. */
export function narrativeOrderOf(
  story: NovelStory,
  project: NovelProject,
): string[] {
  const existing = new Set(project.chapters.map((chapter) => chapter.id));
  const placed = story.narrativeOrder.filter((id) => existing.has(id));
  const seen = new Set(placed);
  const rest = project.chapters
    .map((chapter) => chapter.id)
    .filter((id) => !seen.has(id));
  return [...placed, ...rest];
}

/** `list` with `id` moved to `toIndex`, clamped into range. */
export function moveInList(
  list: readonly string[],
  id: string,
  toIndex: number,
): string[] {
  const from = list.indexOf(id);
  if (from < 0) return [...list];
  const next = [...list];
  next.splice(from, 1);
  const to = Math.max(0, Math.min(next.length, toIndex));
  next.splice(to, 0, id);
  return next;
}

/** Puts a chapter in a storyline, or in none. */
export function assignStoryline(
  story: NovelStory,
  chapterId: string,
  storylineId: string | null,
): NovelStory {
  const storylineOf = { ...story.storylineOf };
  if (storylineId === null) delete storylineOf[chapterId];
  else storylineOf[chapterId] = storylineId;
  return { ...story, storylineOf };
}

export function addStoryline(
  story: NovelStory,
  id: string,
  title: string,
): NovelStory {
  if (story.storylines.some((line) => line.id === id)) return story;
  return { ...story, storylines: [...story.storylines, { id, title }] };
}

export function renameStoryline(
  story: NovelStory,
  id: string,
  title: string,
): NovelStory {
  return {
    ...story,
    storylines: story.storylines.map((line) =>
      line.id === id ? { ...line, title } : line,
    ),
  };
}

/** Takes a storyline away, leaving its chapters in none rather than in a
 *  thread that no longer exists. */
export function removeStoryline(story: NovelStory, id: string): NovelStory {
  const storylineOf: Record<string, string> = {};
  for (const [chapterId, lineId] of Object.entries(story.storylineOf)) {
    if (lineId !== id) storylineOf[chapterId] = lineId;
  }
  return {
    ...story,
    storylines: story.storylines.filter((line) => line.id !== id),
    storylineOf,
  };
}

/** The chapters of each storyline, in manuscript order; `null` holds those
 *  in none. Every storyline gets a list, empty or not. */
export function chaptersByStoryline(
  story: NovelStory,
  project: NovelProject,
): { storylineId: string | null; chapterIds: string[] }[] {
  const groups = story.storylines.map((line) => ({
    storylineId: line.id as string | null,
    chapterIds: [] as string[],
  }));
  groups.push({ storylineId: null, chapterIds: [] });
  const byId = new Map(groups.map((group) => [group.storylineId, group]));
  for (const chapter of project.chapters) {
    const group = byId.get(story.storylineOf[chapter.id] ?? null);
    if (group) group.chapterIds.push(chapter.id);
  }
  return groups;
}

/** A chapter's grid, the starter one when it has none yet. */
export function plotOf(story: NovelStory, chapterId: string): PlotGrid {
  return story.plots[chapterId] ?? emptyPlot();
}

/** The story with a chapter's grid replaced. A grid emptied back to nothing
 *  is dropped, so the file doesn't collect blank entries. */
export function withPlot(
  story: NovelStory,
  chapterId: string,
  grid: PlotGrid,
): NovelStory {
  const plots = { ...story.plots };
  if (grid.rows.length === 0 && grid.columns.length === 0) {
    delete plots[chapterId];
  } else plots[chapterId] = grid;
  return { ...story, plots };
}

const key = (row: number, column: number) => `${row}:${column}`;

/** `grid` with one cell written; an empty text removes the cell. */
export function setCell(
  grid: PlotGrid,
  row: number,
  column: number,
  text: string,
): PlotGrid {
  const cells = { ...grid.cells };
  if (text) cells[key(row, column)] = text;
  else delete cells[key(row, column)];
  return { ...grid, cells };
}

export const cellText = (grid: PlotGrid, row: number, column: number): string =>
  grid.cells[key(row, column)] ?? "";

export function addPlotRow(grid: PlotGrid): PlotGrid {
  return { ...grid, rows: [...grid.rows, ""] };
}

export function addPlotColumn(grid: PlotGrid): PlotGrid {
  return { ...grid, columns: [...grid.columns, ""] };
}

/** Drops a row and slides every cell below it up, so the grid keeps its
 *  shape instead of losing the wrong lines. */
export function removePlotRow(grid: PlotGrid, at: number): PlotGrid {
  const cells: Record<string, string> = {};
  for (const [at_, text] of Object.entries(grid.cells)) {
    const [row, column] = at_.split(":").map(Number);
    if (row === at) continue;
    cells[key(row > at ? row - 1 : row, column)] = text;
  }
  return {
    ...grid,
    rows: grid.rows.filter((_, index) => index !== at),
    cells,
  };
}

export function removePlotColumn(grid: PlotGrid, at: number): PlotGrid {
  const cells: Record<string, string> = {};
  for (const [at_, text] of Object.entries(grid.cells)) {
    const [row, column] = at_.split(":").map(Number);
    if (column === at) continue;
    cells[key(row, column > at ? column - 1 : column)] = text;
  }
  return {
    ...grid,
    columns: grid.columns.filter((_, index) => index !== at),
    cells,
  };
}

/** `grid` with one heading reworded; the cells stay where they are. */
export function setPlotHeading(
  grid: PlotGrid,
  axis: "row" | "column",
  at: number,
  text: string,
): PlotGrid {
  const list = axis === "row" ? grid.rows : grid.columns;
  if (at < 0 || at >= list.length) return grid;
  const next = list.map((value, index) => (index === at ? text : value));
  return axis === "row" ? { ...grid, rows: next } : { ...grid, columns: next };
}
