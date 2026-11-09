import { describe, expect, it } from "vitest";
import {
  CODEX_DIR,
  cardsOfKind,
  cardFromMarkdown,
  cardToMarkdown,
  codexCardPath,
  codexKindDir,
  isCodexKind,
  matchesCard,
  parseCardPath,
  slugFromTitle,
  uniqueSlug,
} from "./codex";
import type { CodexCard } from "./codex";

const card = (over: Partial<CodexCard> = {}): CodexCard => ({
  kind: "character",
  slug: "li-si",
  path: ".textus/novel/codex/character/li-si.md",
  title: "Li Si",
  aliases: [],
  group: "",
  body: "",
  ...over,
});

describe("paths", () => {
  it("puts a kind's cards in its own folder", () => {
    expect(CODEX_DIR).toBe(".textus/novel/codex");
    expect(codexKindDir("place")).toBe(".textus/novel/codex/place");
    expect(codexCardPath("lore", "the-tide")).toBe(
      ".textus/novel/codex/lore/the-tide.md",
    );
  });

  it("reads a card's kind and slug back from its path", () => {
    expect(parseCardPath(".textus/novel/codex/character/li-si.md")).toEqual({
      kind: "character",
      slug: "li-si",
    });
  });

  it("refuses a file that isn't a card", () => {
    expect(parseCardPath(".textus/novel/codex/character/li-si.txt")).toBeNull();
    expect(parseCardPath(".textus/novel/codex/nonsense/x.md")).toBeNull();
    expect(parseCardPath("chapters/li-si.md")).toBeNull();
    // A card in a folder of its own is not the codex's.
    expect(
      parseCardPath(".textus/novel/codex/character/nested/li-si.md"),
    ).toBeNull();
  });

  it("knows the kinds it accepts", () => {
    expect(isCodexKind("character")).toBe(true);
    expect(isCodexKind("plot")).toBe(false);
  });
});

describe("slugs", () => {
  it("joins a name's words with dashes", () => {
    expect(slugFromTitle("Li Si")).toBe("li-si");
    expect(slugFromTitle("  The  Tides of  War! ")).toBe("the-tides-of-war");
  });

  it("keeps a Chinese name readable", () => {
    expect(slugFromTitle("张三")).toBe("张三");
  });

  it("falls back to a usable name for punctuation alone", () => {
    expect(slugFromTitle("!!!")).toBe("card");
    expect(slugFromTitle("")).toBe("card");
  });

  it("counts up rather than replace a taken name", () => {
    expect(uniqueSlug("Li Si", new Set())).toBe("li-si");
    expect(uniqueSlug("Li Si", new Set(["li-si"]))).toBe("li-si-2");
    expect(uniqueSlug("Li Si", new Set(["li-si", "li-si-2"]))).toBe("li-si-3");
  });
});

describe("cardFromMarkdown", () => {
  it("reads the title, group, aliases and body", () => {
    const read = cardFromMarkdown(
      ".textus/novel/codex/character/li-si.md",
      "---\ntitle: 李四\ngroup: 主角阵营\naliases: 阿四, 老李\n---\n\n师父。\n",
    );
    expect(read).toEqual({
      kind: "character",
      slug: "li-si",
      path: ".textus/novel/codex/character/li-si.md",
      title: "李四",
      group: "主角阵营",
      aliases: ["阿四", "老李"],
      body: "师父。\n",
    });
  });

  it("falls back to the file's name for an untitled card", () => {
    const read = cardFromMarkdown(
      ".textus/novel/codex/place/the-tides.md",
      "no front matter",
    );
    expect(read?.title).toBe("the tides");
    expect(read?.group).toBe("");
    expect(read?.body).toBe("no front matter");
  });

  it("is null for a document that isn't a card", () => {
    expect(cardFromMarkdown("chapters/one.md", "")).toBeNull();
  });
});

describe("cardToMarkdown", () => {
  it("writes only the fields that say something", () => {
    expect(cardToMarkdown(card())).toBe("---\ntitle: Li Si\n---\n\n");
  });

  it("writes the group and the aliases when there are any", () => {
    expect(
      cardToMarkdown(
        card({ group: "Mentors", aliases: ["Old Li"], body: "A teacher." }),
      ),
    ).toBe(
      "---\ntitle: Li Si\ngroup: Mentors\naliases: Old Li\n---\n\nA teacher.",
    );
  });

  it("round-trips a card through its document", () => {
    const original = card({
      title: "李四",
      group: "主角阵营",
      aliases: ["阿四", "老李"],
      body: "师父。\n",
    });
    expect(cardFromMarkdown(original.path, cardToMarkdown(original))).toEqual(
      original,
    );
  });
});

describe("cardsOfKind", () => {
  it("keeps its kind and sorts by title", () => {
    const cards = [
      card({ slug: "c", path: "p", title: "Cai" }),
      card({ slug: "a", path: "p", title: "An" }),
      card({ slug: "p", path: "p", title: "Bai", kind: "place" }),
    ];
    expect(cardsOfKind(cards, "character").map((c) => c.title)).toEqual([
      "An",
      "Cai",
    ]);
  });
});

describe("matchesCard", () => {
  const li = card({
    title: "Li Si",
    group: "Mentors",
    aliases: ["Old Li"],
  });

  it("matches any of its names or its group", () => {
    expect(matchesCard(li, "li si")).toBe(true);
    expect(matchesCard(li, "old")).toBe(true);
    expect(matchesCard(li, "mentor")).toBe(true);
    expect(matchesCard(li, "zhang")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesCard(li, "   ")).toBe(true);
  });
});
