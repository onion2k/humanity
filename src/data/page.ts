// The timeline as the pages see it. Vite bundles both data files into the
// build, so a page never reads a path that would point somewhere else once
// the site is built. The integration has already stopped the build on any
// error, so this only builds and hands over the result.
import exportText from "../../data/panic-and-wonder.json?raw";
import editorialText from "../../data/editorial.json?raw";
import { buildTimeline, type Timeline } from "./timeline.ts";

let timeline: Timeline | undefined;

export function pageTimeline(): Timeline {
  timeline ??= buildTimeline(JSON.parse(exportText), JSON.parse(editorialText));
  return timeline;
}
