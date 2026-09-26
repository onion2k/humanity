// Reads the two data files from disk and builds the timeline from them, for
// the integration, the tests and the scripts, which all run from the source
// tree. Pages use page.ts instead, because once built these paths would point
// inside dist/.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildTimeline, type Issue, type Timeline } from "./timeline.ts";

export const EXPORT_PATH = fileURLToPath(new URL("../../data/panic-and-wonder.json", import.meta.url));
export const EDITORIAL_PATH = fileURLToPath(new URL("../../data/editorial.json", import.meta.url));

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadTimeline(exportPath = EXPORT_PATH, editorialPath = EDITORIAL_PATH): Timeline {
  return buildTimeline(readJson(exportPath), existsSync(editorialPath) ? readJson(editorialPath) : {});
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** One line per issue, for the terminal. */
export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `  ${i.level} ${i.code}${i.id ? ` ${i.id}` : ""}: ${i.message}`).join("\n");
}

/** Throws, listing every error, if the timeline has any. Warnings pass. */
export function assertNoErrors(timeline: Timeline): void {
  const errors = timeline.issues.filter((i) => i.level === "error");
  if (errors.length > 0) throw new Error(`The event data has ${count(errors.length, "error")}:\n${formatIssues(errors)}`);
}

/** Throws, listing every issue, if anything stands in the way of publishing: errors, missing sources, years in titles. */
export function assertPublishable(timeline: Timeline): void {
  if (timeline.issues.length > 0) {
    throw new Error(`Not ready to publish: ${count(timeline.issues.length, "issue")}:\n${formatIssues(timeline.issues)}`);
  }
}
