import { describe, expect, it } from "vitest";
import { NOVEL_SKILLS, skillsDir } from "./skills";

/** The front matter block as written, between the fences. */
function frontMatter(markdown: string): string {
  const parts = markdown.split(/^---$/m);
  return parts.length > 2 ? parts[1] : "";
}

/** One `key: value` of the block, nested under `metadata:` or not. */
function field(markdown: string, key: string): string | null {
  const match = new RegExp(`^\\s*${key}:\\s*(.+)$`, "m").exec(
    frontMatter(markdown),
  );
  return match ? match[1].trim().replace(/^"(.*)"$/, "$1") : null;
}

describe("the novel's skills", () => {
  it("are three, each named after its file", () => {
    expect(NOVEL_SKILLS.map((skill) => skill.name)).toEqual([
      "chapter-draft",
      "consistency-check",
      "chapter-review",
    ]);
  });

  it("open with front matter the app can read", () => {
    for (const skill of NOVEL_SKILLS) {
      expect(skill.markdown.startsWith("---\n"), skill.name).toBe(true);
      expect(field(skill.markdown, "name"), skill.name).toBe(skill.name);
      expect(field(skill.markdown, "description"), skill.name).toBe(">-");
    }
  });

  it("carry a version and a mode the app knows", () => {
    for (const skill of NOVEL_SKILLS) {
      const { markdown, name } = skill;
      expect(field(markdown, "textus-version"), name).toBe("1");
      expect(["write", "review"]).toContain(field(markdown, "textus-modes"));
      expect(["both", "user-only", "hidden"]).toContain(
        field(markdown, "textus-invocation"),
      );
    }
  });

  it("say how to be found in the author's own language", () => {
    for (const skill of NOVEL_SKILLS) {
      const { markdown, name } = skill;
      expect(field(markdown, "textus-aliases-zh"), name).toBeTruthy();
      expect(field(markdown, "textus-aliases-en"), name).toBeTruthy();
      expect(field(markdown, "textus-index"), name).toBeTruthy();
    }
  });

  it("has a body after the front matter, not just a heading", () => {
    for (const skill of NOVEL_SKILLS) {
      const body = skill.markdown.split(/^---$/m).slice(2).join("---");
      expect(body.trim().length, skill.name).toBeGreaterThan(200);
    }
  });

  it("tell the agent where the book's facts live", () => {
    // A skill that never names the project's data would have the model
    // invent characters instead of reading the codex.
    for (const skill of NOVEL_SKILLS) {
      expect(skill.markdown, skill.name).toMatch(/\.textus\/novel\/|codex\//);
    }
  });

  it("puts them in the project's own skills folder", () => {
    expect(skillsDir("/book/")).toBe("/book/.textus/skills");
    expect(skillsDir("C:\\book")).toBe("C:\\book/.textus/skills");
  });
});
