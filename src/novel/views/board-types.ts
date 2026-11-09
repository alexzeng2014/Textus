import type { NovelStory } from "../story";
import type { NovelProject } from "../types";

/** What each of the board's tabs is given: the book, the story, and the two
 *  ways out of it - change the story, or open a chapter. */
export interface BoardTabProps {
  /** The project folder, for turning a chapter into a path. */
  root: string;
  project: NovelProject;
  story: NovelStory;
  update: (change: (current: NovelStory) => NovelStory) => void;
  onOpenFile: (path: string) => void;
}
