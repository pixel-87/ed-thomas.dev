import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // readingTime.minutes is the estimated time in minutes
    data.astro.frontmatter.readingTime = Math.ceil(readingTime.minutes);
  };
}
