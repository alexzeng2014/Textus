import { describe, expect, it } from "vitest";
import { codexItems } from "./codex-completion";
import { mentionsCard } from "./references";
import type { CodexCard, CodexKind } from "./codex";

const FOLDER = "/book";
const FROM = "/book/chapters/one.md";

const kindLabel = (kind: CodexKind) => `kind:${kind}`;

const card = (over: Partial<CodexCard> = {}): CodexCard => ({
  kind: "character",
  slug: "li-si",
  path: "codex/character/li-si.md",
  title: "李四",
  aliases: [],
  group: "",
  body: "",
  ...over,
});

const markdown = { wiki: false, format: "shortest" } as const;
const wiki = { wiki: true, format: "shortest" } as const;

describe("codexItems", () => {
  it("gives one row per card, named by its title", () => {
    const items = codexItems([card()], FOLDER, FROM, markdown, kindLabel);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("李四");
  });

  it("writes the card's path out in full, so a reference can be read back", () => {
    const [item] = codexItems([card()], FOLDER, FROM, markdown, kindLabel);
    // Relative to the chapter's own folder, not shortened to a bare name.
    expect(item.insert).toContain("codex/character/li-si");
  });

  it("reads as the card's title rather than its file name", () => {
    const [item] = codexItems([card()], FOLDER, FROM, markdown, kindLabel);
    expect(item.insert).toContain("李四");
  });

  it("follows the document's own link style", () => {
    const [asMarkdown] = codexItems(
      [card()],
      FOLDER,
      FROM,
      markdown,
      kindLabel,
    );
    expect(asMarkdown.insert).toMatch(
      /\[李四\]\([^)]*codex\/character\/li-si\.md\)/,
    );
    const [asWiki] = codexItems([card()], FOLDER, FROM, wiki, kindLabel);
    expect(asWiki.insert).toMatch(
      /\[\[[^\]]*codex\/character\/li-si\|李四\]\]/,
    );
  });

  it("says what kind it is, unless the author filed it under a group", () => {
    const [plain] = codexItems([card()], FOLDER, FROM, markdown, kindLabel);
    expect(plain.detail).toBe("kind:character");
    const [grouped] = codexItems(
      [card({ group: "主角阵营" })],
      FOLDER,
      FROM,
      markdown,
      kindLabel,
    );
    expect(grouped.detail).toBe("主角阵营");
  });

  it("writes a link a backreference can find, in either style", () => {
    // The two halves of the feature meet here: whatever `@` inserts must be
    // what the reference scan recognises, or a mention is a dead end.
    for (const style of [markdown, wiki]) {
      const [item] = codexItems([card()], FOLDER, FROM, style, kindLabel);
      expect(mentionsCard(`他说,${item.insert} 来过。`, card())).toBe(true);
    }
  });

  it("keeps the cards in the order they were given", () => {
    const items = codexItems(
      [
        card({ slug: "a", path: "codex/character/a.md", title: "A" }),
        card({ slug: "b", path: "codex/character/b.md", title: "B" }),
      ],
      FOLDER,
      FROM,
      markdown,
      kindLabel,
    );
    expect(items.map((item) => item.label)).toEqual(["A", "B"]);
  });
});
