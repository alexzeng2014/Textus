import { describe, expect, it } from "vitest";
import {
  mergeDiscovered,
  missingPaths,
  moveChapter,
  renameChapter,
  setChapterAct,
  wordTotals,
} from "./chapters";
import { normaliseProject } from "./novel-project";
import { emptyProject } from "./types";
import type { NovelProject } from "./types";

/** A project with chapters "a", "b", "c" in one act and "d" after it. */
function sample(): NovelProject {
  return {
    version: 1,
    title: "Test",
    goals: { dailyWords: 500, totalWords: 80000 },
    acts: [
      { id: "act1", title: "One" },
      { id: "act2", title: "Two" },
    ],
    chapters: [
      { id: "a", path: "a.md", title: "", actId: "act1", status: "draft" },
      { id: "b", path: "b.md", title: "B", actId: "act1", status: "draft" },
      { id: "c", path: "c.md", title: "", actId: "act2", status: "draft" },
      { id: "d", path: "d.md", title: "", actId: "act2", status: "draft" },
    ],
  };
}

const ids = (project: NovelProject) =>
  project.chapters.map((chapter) => chapter.id);

describe("mergeDiscovered", () => {
  it("leaves the project alone when every document is listed", () => {
    const project = sample();
    expect(mergeDiscovered(project, ["a.md", "b.md"], 1)).toBe(project);
  });

  it("puts a new document before the first chapter, keeping the order", () => {
    const merged = mergeDiscovered(sample(), ["a.md", "new.md"], 1);
    expect(ids(merged)).toEqual(["d1-0", "a", "b", "c", "d"]);
    expect(merged.chapters[0]).toMatchObject({
      path: "new.md",
      actId: null,
      status: "draft",
    });
  });

  it("adds several in the order they were found, without duplicate ids", () => {
    const merged = mergeDiscovered(sample(), ["x.md", "y.md"], 1);
    const added = merged.chapters.slice(0, 2).map((chapter) => chapter.id);
    expect(new Set(added).size).toBe(2);
    expect(merged.chapters.map((chapter) => chapter.path).slice(0, 2)).toEqual([
      "x.md",
      "y.md",
    ]);
  });
});

describe("missingPaths", () => {
  it("names the listed chapters with no document", () => {
    expect([...missingPaths(sample(), ["a.md", "c.md"])].sort()).toEqual([
      "b.md",
      "d.md",
    ]);
  });

  it("is empty when everything is on disk", () => {
    expect(missingPaths(sample(), ["a.md", "b.md", "c.md", "d.md"]).size).toBe(
      0,
    );
  });
});

describe("moveChapter", () => {
  it("moves a chapter to an index", () => {
    expect(ids(moveChapter(sample(), "a", 2))).toEqual(["b", "c", "a", "d"]);
  });

  it("clamps rather than dropping a chapter past the end", () => {
    expect(ids(moveChapter(sample(), "a", 99))).toEqual(["b", "c", "d", "a"]);
  });

  it("returns the same project when nothing moves", () => {
    const project = sample();
    expect(moveChapter(project, "a", 0)).toBe(project);
    expect(moveChapter(project, "nope", 1)).toBe(project);
  });
});

describe("setChapterAct", () => {
  it("puts a chapter after the last one already in that act", () => {
    const moved = setChapterAct(sample(), "d", "act1");
    expect(ids(moved)).toEqual(["a", "b", "d", "c"]);
    expect(moved.chapters.find((c) => c.id === "d")?.actId).toBe("act1");
  });

  it("puts a chapter with no act before the first act's chapters", () => {
    const moved = setChapterAct(sample(), "c", null);
    expect(ids(moved)).toEqual(["c", "a", "b", "d"]);
  });

  it("keeps the chapter when its act has no chapters yet", () => {
    const project = {
      ...sample(),
      acts: [...sample().acts, { id: "act3", title: "Three" }],
    };
    const moved = setChapterAct(project, "a", "act3");
    expect(ids(moved)).toEqual(["b", "c", "d", "a"]);
  });
});

describe("renameChapter", () => {
  it("sets the title and leaves the order alone", () => {
    const renamed = renameChapter(sample(), "a", "First Light");
    expect(renamed.chapters[0].title).toBe("First Light");
    expect(ids(renamed)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("wordTotals", () => {
  it("adds up every chapter, counting an unread one as zero", () => {
    const totals = wordTotals(
      sample(),
      new Map([
        ["a", 100],
        ["b", 50],
      ]),
    );
    expect(totals.total).toBe(150);
    expect(totals.byId.get("c")).toBe(0);
  });
});

describe("normaliseProject", () => {
  it("gives the empty project for junk", () => {
    expect(normaliseProject(null)).toEqual(emptyProject());
    expect(normaliseProject("nope")).toEqual(emptyProject());
    expect(normaliseProject([])).toEqual(emptyProject());
  });

  it("keeps what it can recognise and drops the rest", () => {
    const project = normaliseProject({
      title: "Book",
      goals: { dailyWords: 300, totalWords: "plenty" },
      acts: [{ id: "a1", title: "One" }, { title: "no id" }],
      chapters: [
        { id: "c1", path: "c1.md", actId: "a1", status: "done" },
        { id: "c2", path: "c2.md", actId: "gone", status: "weird" },
        { path: "no-id.md" },
      ],
    });
    expect(project.title).toBe("Book");
    expect(project.goals).toEqual({ dailyWords: 300, totalWords: 0 });
    expect(project.acts.map((act) => act.id)).toEqual(["a1"]);
    expect(project.chapters.map((chapter) => chapter.id)).toEqual(["c1", "c2"]);
    expect(project.chapters[0].status).toBe("done");
    // An act that isn't there leaves the chapter before the first.
    expect(project.chapters[1].actId).toBeNull();
    expect(project.chapters[1].status).toBe("draft");
  });

  it("drops a duplicate id rather than drawing the row twice", () => {
    const project = normaliseProject({
      chapters: [
        { id: "c1", path: "a.md" },
        { id: "c1", path: "b.md" },
      ],
    });
    expect(project.chapters).toHaveLength(1);
  });
});
