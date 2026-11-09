import { describe, expect, it } from "vitest";
import { chapterTodos, todosIn } from "./todos";

describe("todosIn", () => {
  it("finds a TODO line, with its line number", () => {
    const found = todosIn("第一段\nTODO: 重写这里\n第三段");
    expect(found).toEqual([{ line: 2, kind: "todo", text: "重写这里" }]);
  });

  it("knows FIXME from NOTE from TODO", () => {
    const found = todosIn("FIXME: 名字写错了\nNOTE: 这里需要查证");
    expect(found.map((todo) => todo.kind)).toEqual(["fixme", "note"]);
  });

  it("takes the marker inside a bullet", () => {
    expect(todosIn("- TODO: 补一段环境")[0]).toMatchObject({
      kind: "todo",
      text: "补一段环境",
    });
  });

  it("finds an unticked task and ignores a ticked one", () => {
    const found = todosIn("- [ ] 加一个场景\n- [x] 已经做了");
    expect(found).toEqual([{ line: 1, kind: "task", text: "加一个场景" }]);
  });

  it("reads a numbered list's task", () => {
    expect(todosIn("1. [ ] 换个开头")[0]).toMatchObject({
      kind: "task",
      text: "换个开头",
    });
  });

  it("skips a fenced code block", () => {
    const found = todosIn("正文\n```\nTODO: 代码里的不算\n```\nTODO: 这个算");
    expect(found.map((todo) => todo.text)).toEqual(["这个算"]);
  });

  it("finds nothing in prose that merely says the word", () => {
    expect(todosIn("他 todo 了这件事")).toEqual([]);
    expect(todosIn("TODO:")).toEqual([]);
  });

  it("keeps the order they appear in", () => {
    const found = todosIn("TODO: 一\n中间\nTODO: 二");
    expect(found.map((todo) => todo.text)).toEqual(["一", "二"]);
  });
});

describe("chapterTodos", () => {
  it("names the chapter each todo came from", () => {
    const found = chapterTodos([
      { id: "a", text: "TODO: 改人名" },
      { id: "b", text: "没有" },
      { id: "c", text: "- [ ] 补结尾" },
    ]);
    expect(found).toEqual([
      { chapterId: "a", line: 1, kind: "todo", text: "改人名" },
      { chapterId: "c", line: 1, kind: "task", text: "补结尾" },
    ]);
  });
});
