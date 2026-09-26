// The performance gate. Each figure has a budget it may never pass and a
// baseline it is held to both ways, per screen size: a figure that falls a
// long way is as much a change as one that climbs, and usually means the page
// stopped doing something. Sizes and counts come out the same every run, so
// they are held tightly. Timings wobble, so each is the middle of three runs
// and is held within a factor of two, or 25ms, whichever is wider. Write new baselines with
// UPDATE_PERF_BASELINE=1, and only for a change meant to move them.
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { measureLoad, measureScroll, type LoadFigures, type ScrollFigures } from "./measure.ts";

type Figures = LoadFigures & ScrollFigures;
type Name = keyof Figures;

const BASELINE_PATH = new URL("./baselines/performance.json", import.meta.url);

/** Exact counts, sizes that move only with the content, and timings that wobble run to run. */
const EXACT: Name[] = ["fontsOnLoad", "fontsAtEnd", "scriptBytes"];
const SIZES: Name[] = ["htmlBytes", "htmlGzipBytes", "cssBytes", "fontBytesOnLoad", "domNodes", "steps"];
const TIMINGS: Name[] = [
  "firstContentfulPaintMs",
  "loadLayoutMs",
  "loadStyleMs",
  "layoutMs",
  "styleMs",
  "taskMs",
  "worstStepMs",
];
const SIZE_TOLERANCE = 0.02;
const TIMING_FACTOR = 2;
/** A small timing can double on noise alone, so every window is at least this wide either way. */
const TIMING_SLACK_MS = 25;

/**
 * Ceilings, at 4× CPU slowdown on this machine as a stand-in for a mid-range phone. They leave room to grow but
 * catch a page that has started doing its work up front or all at once.
 */
const BUDGET: Partial<Record<Name, number>> = {
  htmlGzipBytes: 60_000,
  cssBytes: 40_000,
  scriptBytes: 0,
  domNodes: 9_000,
  fontsOnLoad: 5,
  firstContentfulPaintMs: 400,
  loadLayoutMs: 150,
  worstStepMs: 100,
  longFrames: 3,
  layoutMs: 400,
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function readBaselines(): Record<string, Partial<Figures>> {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, Partial<Figures>>;
  } catch {
    return {};
  }
}

test("performance holds to its budgets and baselines @perf", async ({
  browser,
  viewport,
  isMobile,
  hasTouch,
  deviceScaleFactor,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const project = info.project.name;
  const runs: Figures[] = [];
  for (let i = 0; i < 3; i++) {
    // A fresh context each run, sized like the project's own, so no run inherits another's cache.
    const context = await browser.newContext({
      viewport,
      isMobile,
      hasTouch,
      ...(deviceScaleFactor === undefined ? {} : { deviceScaleFactor }),
      ...(baseURL === undefined ? {} : { baseURL }),
    });
    const loadPage = await context.newPage();
    const load = await measureLoad(loadPage, await context.newCDPSession(loadPage));
    const scrollPage = await context.newPage();
    const scroll = await measureScroll(scrollPage, await context.newCDPSession(scrollPage));
    runs.push({ ...load, ...scroll });
    await context.close();
  }
  const [first] = runs;
  if (!first) throw new Error("No runs measured");
  const figures: Figures = { ...first };
  for (const name of Object.keys(first) as Name[]) figures[name] = median(runs.map((r) => r[name]));
  await info.attach("performance.json", {
    body: JSON.stringify(figures, null, 2),
    contentType: "application/json",
  });
  console.log(`${project}: ${JSON.stringify(figures)}`);

  if (process.env.UPDATE_PERF_BASELINE === "1") {
    const all = readBaselines();
    all[project] = figures;
    writeFileSync(BASELINE_PATH, `${JSON.stringify(all, null, 2)}\n`);
    return;
  }

  const baseline = readBaselines()[project];
  expect(baseline, `No performance baseline for ${project}: run with UPDATE_PERF_BASELINE=1`).toBeDefined();
  const problems: string[] = [];
  for (const [name, ceiling] of Object.entries(BUDGET) as [Name, number][]) {
    if (figures[name] > ceiling) problems.push(`${name} ${figures[name]} is over its budget of ${ceiling}`);
  }
  for (const name of EXACT) {
    if (figures[name] !== baseline?.[name])
      problems.push(`${name} ${figures[name]} is not its baseline ${baseline?.[name]}`);
  }
  for (const name of SIZES) {
    const was = baseline?.[name] ?? 0;
    if (Math.abs(figures[name] - was) > was * SIZE_TOLERANCE) {
      problems.push(`${name} ${figures[name]} moved more than ${SIZE_TOLERANCE * 100}% from ${was}`);
    }
  }
  for (const name of TIMINGS) {
    const was = baseline?.[name] ?? 0;
    const high = Math.max(was * TIMING_FACTOR, was + TIMING_SLACK_MS);
    const low = Math.min(was / TIMING_FACTOR, was - TIMING_SLACK_MS);
    if (figures[name] > high || figures[name] < low) {
      problems.push(
        `${name} ${figures[name]}ms is outside ${Math.round(low)}–${Math.round(high)}ms around its baseline ${was}ms`,
      );
    }
  }
  expect(problems).toEqual([]);
});
