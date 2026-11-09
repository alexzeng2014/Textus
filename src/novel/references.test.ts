import { describe, expect, it } from "vitest";
import {
  cardLinkNeedle,
  documentsMentioning,
  mentionsCard,
  type FolderDocument,
} from "./references";
import type { CodexCard } from "./codex";

const li = (over: Partial<CodexCard> = {}): CodexCard => ({
  kind: "character",
  slug: "li-si",
  path: "codex/character/li-si.md",
  title: "李四",
  aliases: [],
  group: "",
  body: "",
  ...over,
});

const doc = (rel: string, text: string): FolderDocument => ({
  path: `/book/${rel}`,
  rel,
  text,
});

describe("cardLinkNeedle", () => {
  it("is the card's path without its extension", () => {
    expect(cardLinkNeedle(li())).toBe("codex/character/li-si");
  });
});

describe("mentionsCard", () => {
  it("finds a Markdown link", () => {
    expect(
      mentionsCard("他说,[李四](codex/character/li-si.md) 来过。", li()),
    ).toBe(true);
  });

  it("finds a wiki link with an alias", () => {
    expect(
      mentionsCard("他说,[[codex/character/li-si|李四]] 来过。", li()),
    ).toBe(true);
  });

  it("finds a link written without an alias", () => {
    expect(mentionsCard("[[codex/character/li-si]]", li())).toBe(true);
  });

  it("does not take the bare name for a link", () => {
    // The prose naming someone is not a reference to their card.
    expect(mentionsCard("李四来过。", li())).toBe(false);
  });

  it("does not confuse one card with another of the same kind", () => {
    expect(mentionsCard("[王五](codex/character/wang-wu.md)", li())).toBe(
      false,
    );
  });

  it("reads the path however it is cased", () => {
    expect(mentionsCard("[Li](CODEX/Character/Li-Si.md)", li())).toBe(true);
  });
});

describe("documentsMentioning", () => {
  it("keeps the documents that link to the card, in order", () => {
    const found = documentsMentioning(
      [
        doc("ch1.md", "开头,[李四](codex/character/li-si.md) 出场。"),
        doc("ch2.md", "没有提到他。"),
        doc("ch3.md", "[[codex/character/li-si|李四]]"),
      ],
      li(),
    );
    expect(found.map((d) => d.rel)).toEqual(["ch1.md", "ch3.md"]);
  });

  it("leaves out the card's own document", () => {
    const found = documentsMentioning(
      [doc("codex/character/li-si.md", "见 codex/character/li-si")],
      li(),
    );
    expect(found).toEqual([]);
  });

  it("is empty when nothing links to it", () => {
    expect(documentsMentioning([doc("ch1.md", "plain prose")], li())).toEqual(
      [],
    );
  });
});
