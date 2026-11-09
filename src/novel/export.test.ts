import { describe, expect, it } from "vitest";
import { bookMarkdown } from "./export";

const chapter = (
  over: Partial<{ title: string; actTitle: string | null; text: string }> = {},
) => ({ title: "Chapter", actTitle: null, text: "Prose.", ...over });

describe("bookMarkdown", () => {
  it("heads the book, each volume and each chapter", () => {
    const markdown = bookMarkdown("The Book", [
      chapter({ title: "One", actTitle: "Act I", text: "First." }),
      chapter({ title: "Two", actTitle: "Act I", text: "Second." }),
      chapter({ title: "Three", actTitle: "Act II", text: "Third." }),
    ]);
    expect(markdown).toBe(
      [
        "# The Book",
        "",
        "## Act I",
        "",
        "### One",
        "",
        "First.",
        "",
        "### Two",
        "",
        "Second.",
        "",
        "## Act II",
        "",
        "### Three",
        "",
        "Third.",
        "",
      ].join("\n"),
    );
  });

  it("leaves out a volume heading a chapter has none for", () => {
    const markdown = bookMarkdown("", [
      chapter({ title: "Prologue", actTitle: null, text: "Before." }),
      chapter({ title: "One", actTitle: "Act I", text: "After." }),
    ]);
    expect(markdown.startsWith("### Prologue")).toBe(true);
    expect(markdown).toContain("## Act I");
  });

  it("writes no book heading when the book has no name", () => {
    const markdown = bookMarkdown("  ", [chapter({ title: "One" })]);
    expect(markdown.startsWith("### One")).toBe(true);
  });

  it("names a chapter that has none", () => {
    expect(bookMarkdown("", [chapter({ title: "" })])).toContain(
      "### Untitled",
    );
  });

  it("leaves no blank body between a heading and the next", () => {
    const markdown = bookMarkdown("", [
      chapter({ title: "Empty", text: "   " }),
      chapter({ title: "Full", text: "Text." }),
    ]);
    expect(markdown).toBe("### Empty\n\n### Full\n\nText.\n");
  });

  it("trims trailing whitespace off a chapter's prose", () => {
    expect(bookMarkdown("", [chapter({ text: "Text.\n\n\n" })])).toBe(
      "### Chapter\n\nText.\n",
    );
  });

  it("ends the file with a newline", () => {
    expect(bookMarkdown("B", [chapter()])).toMatch(/\n$/);
  });
});
