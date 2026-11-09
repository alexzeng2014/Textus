/** The writing skills a novel project starts with. They are ordinary
 *  project skills - Markdown files in `.textus/skills/`, which the app
 *  already loads - so installing them needs no native code, and the author
 *  can edit or delete any of them afterwards like any other skill.
 *
 *  They are written to be read by the agent, not by the app: each says what
 *  to read out of the project (the manuscript, the codex, the story file)
 *  and what it may not do. */

import { fs } from "../platform/ipc";

export interface NovelSkill {
  /** The file's name, and the skill's. */
  name: string;
  markdown: string;
}

const CHAPTER_DRAFT = `---
name: chapter-draft
description: >-
  起草长篇小说的一章：读设定卡与叙事时间线，接住前一章的语气，按段落
  提议草稿供作者逐段取舍。用户点名某一章要用它。
metadata:
  textus-version: "1"
  textus-invocation: "user-only"
  textus-modes: "write"
  textus-index: "按卷章结构、设定库和叙事时间线起草一章。"
  textus-aliases-en: "draft chapter, write the chapter"
  textus-aliases-zh: "起草章节, 写这一章, 续写这一章"
---

# 起草章节

## 什么时候用

作者点名要写某一章时。没被要求就不要主动起草。

## 步骤

1. 读 \`.textus/novel/project.json\`，确认这一章在哪个卷、前后各是哪一章。
2. 读 \`.textus/novel/story.json\`，确认它在叙事时间线上的位置和所属故事线。
3. 用 find_files 列出 \`codex/\` 下的卡片，读与本章相关的：出场人物的卡（别名、分组、关系）、地点卡、相关世界观。
4. 读前一章的结尾，接住场景与语气。这一章若已有内容，在它基础上续写，不要推倒重来。
5. 起草。保持作者已经确立的视角、人称与语感。\`codex/\` 里的设定是事实：不要为了让情节顺下去而改动设定。
6. 用 propose_edit 按段落提交，让作者逐段取舍。不要用整块替换盖掉已有正文。

## 不要做

- 不要在正文里留「（待补充）」这类占位符。
- 不要新增设定卡，也不要改动 \`codex/\` 里既有的设定，除非作者明确要求。
- 不要改动 \`.textus/novel/\` 下 JSON 的结构。
`;

const CONSISTENCY_CHECK = `---
name: consistency-check
description: >-
  对照设定库与叙事时间线审校全书或指定章节的一致性：人名与称谓、人物关系、
  地点物品、时间顺序、世界观规则。只挂批注，不改正文。
metadata:
  textus-version: "1"
  textus-invocation: "both"
  textus-modes: "review"
  textus-index: "对照设定库检查人名、关系、时空与世界观的一致性。"
  textus-aliases-en: "consistency, check the codex"
  textus-aliases-zh: "一致性, 设定冲突, 查设定"
---

# 一致性审校

## 范围

作者指定的章节，或整本书。

## 查什么

1. **人物**：姓名与别名是否与 \`codex/character/\` 一致；同一人的称谓是否统一；已经死亡或离场的人是否又出场。
2. **关系**：人物之间的关系是否与卡片记载相反或冲突。
3. **地点与物品**：名称、方位、属性是否前后矛盾。
4. **时间**：事件顺序是否与 \`.textus/novel/story.json\` 的 \`narrativeOrder\` 冲突；季节、时长、年龄是否自洽。
5. **世界观**：是否违反 \`codex/lore/\` 里的规则。

## 怎么做

- 先用 find_files 与 search_files 收齐证据，再下结论。每一条给出：章节、行号、原文、与之冲突的卡片、建议改法。
- 用 add_comment 把问题挂在具体段落上，**不要直接改正文**。
- 拿不准的标成「待作者确认」，不要当成错误。
`;

const CHAPTER_REVIEW = `---
name: chapter-review
description: >-
  章末审阅：这一章有没有推进故事，与所属故事线是否一致，视角语感是否
  统一，伏笔是否该埋该收。只写批注。
metadata:
  textus-version: "1"
  textus-invocation: "user-only"
  textus-modes: "review"
  textus-index: "审阅一章的结构、故事线与伏笔，只挂批注。"
  textus-aliases-en: "review chapter, chapter notes"
  textus-aliases-zh: "审阅本章, 这一章怎么样"
---

# 章末审阅

## 范围

当前这一章。

## 看什么

- 有没有推进故事：目标、阻碍、转折、结果是否成立。
- 与所属故事线是否一致（\`.textus/novel/story.json\` 的 \`storylineOf\`）。
- 视角、时态、语感是否与全书一致。
- 该埋的伏笔有没有埋，该收的有没有收。

## 输出

只写批注，不改正文。用 add_comment 挂在相关段落上，每条一句话说清问题，必要时给一句改法示例。最多 8 条，按重要性排序。
`;

export const NOVEL_SKILLS: readonly NovelSkill[] = [
  { name: "chapter-draft", markdown: CHAPTER_DRAFT },
  { name: "consistency-check", markdown: CONSISTENCY_CHECK },
  { name: "chapter-review", markdown: CHAPTER_REVIEW },
];

/** Where a project's skills live, relative to its folder. */
export const skillsDir = (root: string) =>
  `${root.replace(/[\\/]+$/, "")}/.textus/skills`;

/** Writes the skills the project doesn't have yet, and leaves alone the ones
 *  it does: an author who edited one shouldn't lose it to a second click.
 *  Returns the names it wrote. */
export async function installNovelSkills(
  root: string,
  skills: readonly NovelSkill[] = NOVEL_SKILLS,
): Promise<string[]> {
  const dir = skillsDir(root);
  const written: string[] = [];
  for (const skill of skills) {
    const path = `${dir}/${skill.name}.md`;
    if ((await fs.fileMtimeMs(path)) !== null) continue;
    await fs.writeTextFile(path, skill.markdown);
    written.push(skill.name);
  }
  return written;
}
