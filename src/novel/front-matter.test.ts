import { describe, expect, it } from "vitest";
import {
  joinFrontMatter,
  listField,
  setListField,
  splitFrontMatter,
} from "./front-matter";

describe("splitFrontMatter", () => {
  it("gives the whole document as the body when it opens with no fence", () => {
    const { fields, body } = splitFrontMatter("# Title\n\ntext");
    expect(fields).toEqual({});
    expect(body).toBe("# Title\n\ntext");
  });

  it("reads the pairs and leaves the body after them", () => {
    const doc = "---\ntitle: 李四\ngroup: 主角阵营\n---\n\n他是主角的师父。\n";
    const { fields, body } = splitFrontMatter(doc);
    expect(fields).toEqual({ title: "李四", group: "主角阵营" });
    expect(body).toBe("他是主角的师父。\n");
  });

  it("treats an unclosed fence as a horizontal rule, not an error", () => {
    const doc = "---\ntitle: 李四\n\ntext";
    const { fields, body } = splitFrontMatter(doc);
    expect(fields).toEqual({});
    expect(body).toBe(doc);
  });

  it("keeps a quoted value's colons and spaces", () => {
    const { fields } = splitFrontMatter(
      "---\ntitle: \"A: B\"\ngroup: '  spaced  '\n---\n",
    );
    expect(fields.title).toBe("A: B");
    expect(fields.group).toBe("  spaced  ");
  });

  it("skips blank lines and comments", () => {
    const { fields } = splitFrontMatter(
      "---\n\n# a note\ntitle: X\n\n---\nbody",
    );
    expect(fields).toEqual({ title: "X" });
  });

  it("reads a BOM from another editor", () => {
    const { fields } = splitFrontMatter("﻿---\ntitle: X\n---\nbody");
    expect(fields.title).toBe("X");
  });

  it("accepts ... as the closing fence", () => {
    const { fields, body } = splitFrontMatter("---\ntitle: X\n...\nbody");
    expect(fields.title).toBe("X");
    expect(body).toBe("body");
  });

  it("keeps a second --- inside the body rather than rereading it", () => {
    const { body } = splitFrontMatter("---\ntitle: X\n---\na\n---\nb");
    expect(body).toBe("a\n---\nb");
  });
});

describe("joinFrontMatter", () => {
  it("writes the pairs in order and one blank line before the body", () => {
    expect(joinFrontMatter({ title: "Li Si", group: "Mentors" }, "Body")).toBe(
      "---\ntitle: Li Si\ngroup: Mentors\n---\n\nBody",
    );
  });

  it("is just the body when there is nothing to say", () => {
    expect(joinFrontMatter({}, "Body")).toBe("Body");
    expect(joinFrontMatter({ title: "" }, "Body")).toBe("Body");
  });

  it("quotes a value that would otherwise read as something else", () => {
    expect(joinFrontMatter({ title: "A: B" }, "")).toBe(
      '---\ntitle: "A: B"\n---\n\n',
    );
    expect(joinFrontMatter({ title: "- dash" }, "")).toBe(
      '---\ntitle: "- dash"\n---\n\n',
    );
  });

  it("round-trips a quoted value through the reader", () => {
    const doc = joinFrontMatter({ title: 'He said "hi": once' }, "");
    expect(splitFrontMatter(doc).fields.title).toBe('He said "hi": once');
  });

  it("leaves an ordinary name unquoted, as a hand-written card would", () => {
    expect(joinFrontMatter({ title: "张三" }, "")).toBe(
      "---\ntitle: 张三\n---\n\n",
    );
  });
});

describe("list fields", () => {
  it("splits a comma-separated value and drops blanks", () => {
    expect(listField({ aliases: "小张,  阿三 , " }, "aliases")).toEqual([
      "小张",
      "阿三",
    ]);
    expect(listField({}, "aliases")).toEqual([]);
  });

  it("joins values and keeps a comma out of one", () => {
    expect(setListField({}, "aliases", ["小张", "阿,三", " "])).toEqual({
      aliases: "小张, 阿 三",
    });
  });

  it("drops the field when nothing is left", () => {
    expect(setListField({ title: "X", aliases: "a" }, "aliases", [])).toEqual({
      title: "X",
    });
  });

  it("round-trips through the document", () => {
    const fields = setListField({}, "aliases", ["小张", "阿三"]);
    const { fields: read } = splitFrontMatter(joinFrontMatter(fields, ""));
    expect(listField(read, "aliases")).toEqual(["小张", "阿三"]);
  });
});
