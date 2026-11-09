import { describe, expect, it } from "vitest";
import {
  addPlotColumn,
  addPlotRow,
  addStoryline,
  assignStoryline,
  cellText,
  chaptersByStoryline,
  emptyPlot,
  emptyStory,
  moveInList,
  narrativeOrderOf,
  normaliseStory,
  plotOf,
  removePlotColumn,
  removePlotRow,
  removeStoryline,
  renameStoryline,
  setCell,
  setPlotHeading,
  withPlot,
} from "./story";
import type { NovelProject } from "./types";

const project = (): NovelProject => ({
  version: 1,
  title: "Book",
  goals: { dailyWords: 0, totalWords: 0 },
  acts: [],
  chapters: [
    { id: "a", path: "a.md", title: "", actId: null, status: "draft" },
    { id: "b", path: "b.md", title: "", actId: null, status: "draft" },
    { id: "c", path: "c.md", title: "", actId: null, status: "draft" },
  ],
});

describe("normaliseStory", () => {
  it("gives the empty story for junk", () => {
    expect(normaliseStory(null)).toEqual(emptyStory());
    expect(normaliseStory("nope")).toEqual(emptyStory());
  });

  it("keeps what it recognises and drops a thread that isn't there", () => {
    const story = normaliseStory({
      storylines: [{ id: "s1", title: "Main" }, { title: "no id" }],
      storylineOf: { a: "s1", b: "gone" },
      narrativeOrder: ["c", "c", "a"],
      plots: { a: { columns: ["x"], rows: ["y"], cells: { "0:0": "hi" } } },
    });
    expect(story.storylines).toEqual([{ id: "s1", title: "Main" }]);
    expect(story.storylineOf).toEqual({ a: "s1" });
    expect(story.narrativeOrder).toEqual(["c", "a"]);
    expect(cellText(plotOf(story, "a"), 0, 0)).toBe("hi");
  });

  it("drops a cell outside the grid it belongs to", () => {
    const story = normaliseStory({
      plots: {
        a: {
          columns: ["only"],
          rows: ["one"],
          cells: { "0:0": "kept", "5:0": "outside", "0:9": "outside" },
        },
      },
    });
    expect(plotOf(story, "a").cells).toEqual({ "0:0": "kept" });
  });

  it("names an untitled thread after its id rather than nothing", () => {
    const story = normaliseStory({ storylines: [{ id: "s1" }] });
    expect(story.storylines[0].title).toBe("s1");
  });
});

describe("the story file", () => {
  it("survives a trip through JSON unchanged", () => {
    // Everything the board writes must come back exactly: a normaliser that
    // quietly drops a field would lose a chapter's grid on the next open.
    let story = addStoryline(emptyStory(), "s1", "Main");
    story = assignStoryline(story, "a", "s1");
    story = withPlot(story, "a", setCell(emptyPlot(), 1, 1, "转折"));
    story = { ...story, narrativeOrder: ["b", "a"] };
    const read = normaliseStory(JSON.parse(JSON.stringify(story)));
    expect(read).toEqual(story);
  });
});

describe("narrativeOrderOf", () => {
  it("follows the author's order, then the rest in manuscript order", () => {
    const story = { ...emptyStory(), narrativeOrder: ["c", "a"] };
    expect(narrativeOrderOf(story, project())).toEqual(["c", "a", "b"]);
  });

  it("drops a chapter that is no longer in the book", () => {
    const story = { ...emptyStory(), narrativeOrder: ["gone", "b"] };
    expect(narrativeOrderOf(story, project())).toEqual(["b", "a", "c"]);
  });

  it("is the manuscript's own order when nothing is placed", () => {
    expect(narrativeOrderOf(emptyStory(), project())).toEqual(["a", "b", "c"]);
  });
});

describe("moveInList", () => {
  it("moves an entry to an index", () => {
    expect(moveInList(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });

  it("clamps instead of dropping past an end", () => {
    expect(moveInList(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveInList(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
  });

  it("leaves the list alone for an entry that isn't there", () => {
    expect(moveInList(["a", "b"], "x", 0)).toEqual(["a", "b"]);
  });
});

describe("storylines", () => {
  it("assigns a chapter to a thread and takes it out again", () => {
    const story = assignStoryline(emptyStory(), "a", "s1");
    expect(story.storylineOf).toEqual({ a: "s1" });
    expect(assignStoryline(story, "a", null).storylineOf).toEqual({});
  });

  it("adds a thread once, and ignores a taken id", () => {
    const added = addStoryline(emptyStory(), "s1", "Main");
    expect(added.storylines).toHaveLength(1);
    expect(addStoryline(added, "s1", "Other")).toBe(added);
  });

  it("renames a thread", () => {
    const story = renameStoryline(
      addStoryline(emptyStory(), "s1", "Main"),
      "s1",
      "主线",
    );
    expect(story.storylines[0].title).toBe("主线");
  });

  it("leaves a removed thread's chapters in none", () => {
    let story = addStoryline(emptyStory(), "s1", "Main");
    story = assignStoryline(story, "a", "s1");
    const after = removeStoryline(story, "s1");
    expect(after.storylines).toEqual([]);
    expect(after.storylineOf).toEqual({});
  });

  it("groups the chapters in manuscript order, threads first", () => {
    let story = addStoryline(emptyStory(), "s1", "Main");
    story = assignStoryline(story, "b", "s1");
    const groups = chaptersByStoryline(story, project());
    expect(groups).toEqual([
      { storylineId: "s1", chapterIds: ["b"] },
      { storylineId: null, chapterIds: ["a", "c"] },
    ]);
  });
});

describe("plot grids", () => {
  it("starts a chapter on the empty grid", () => {
    expect(plotOf(emptyStory(), "a")).toEqual(emptyPlot());
  });

  it("writes a cell and clears it", () => {
    let grid = setCell(emptyPlot(), 1, 2, "a turn");
    expect(cellText(grid, 1, 2)).toBe("a turn");
    grid = setCell(grid, 1, 2, "");
    expect(cellText(grid, 1, 2)).toBe("");
    expect(grid.cells).toEqual({});
  });

  it("adds a row and a column at the end", () => {
    const grid = addPlotColumn(addPlotRow(emptyPlot()));
    expect(grid.rows).toHaveLength(3);
    expect(grid.columns).toHaveLength(4);
  });

  it("drops a row and slides the cells below it up", () => {
    let grid = emptyPlot();
    grid = setCell(grid, 0, 0, "first");
    grid = setCell(grid, 1, 0, "second");
    grid = removePlotRow(grid, 0);
    expect(grid.rows).toHaveLength(1);
    expect(cellText(grid, 0, 0)).toBe("second");
  });

  it("drops a column and slides the cells right of it left", () => {
    let grid = emptyPlot();
    grid = setCell(grid, 0, 0, "left");
    grid = setCell(grid, 0, 2, "right");
    grid = removePlotColumn(grid, 1);
    expect(grid.columns).toHaveLength(2);
    expect(cellText(grid, 0, 0)).toBe("left");
    expect(cellText(grid, 0, 1)).toBe("right");
  });

  it("drops the cells of the row or column it removed", () => {
    let grid = setCell(emptyPlot(), 1, 1, "gone");
    grid = removePlotRow(grid, 1);
    expect(grid.cells).toEqual({});
  });

  it("rewords a heading without moving the cells", () => {
    let grid = setCell(emptyPlot(), 0, 0, "kept");
    grid = setPlotHeading(grid, "row", 0, "场景一");
    expect(grid.rows[0]).toBe("场景一");
    expect(cellText(grid, 0, 0)).toBe("kept");
  });

  it("ignores a heading that isn't there", () => {
    const grid = emptyPlot();
    expect(setPlotHeading(grid, "row", 9, "x")).toBe(grid);
  });

  it("drops a grid emptied back to nothing", () => {
    const graphed = withPlot(emptyStory(), "a", emptyPlot());
    expect(graphed.plots.a).toBeDefined();
    const cleared = withPlot(graphed, "a", {
      rows: [],
      columns: [],
      cells: {},
    });
    expect(cleared.plots.a).toBeUndefined();
  });
});
