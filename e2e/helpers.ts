// What every browser test starts from: the built page, loaded fresh, with the
// test API ready. Tests reach the page only through here and window.__pw.
import { expect, type Page } from "@playwright/test";
import { loadTimeline } from "../src/data/load.ts";
import type { PageState } from "../src/client/test-api.ts";
import type { EraId } from "../src/eras.ts";

export const timeline = loadTimeline();

export async function openTimeline(page: Page): Promise<void> {
  await page.goto("/");
  // The test API installs as the page loads. If it is missing, this is a production build or a broken script,
  // and saying so beats every test timing out on its own.
  await page
    .waitForFunction(() => window.__pw !== undefined, undefined, { timeout: 5_000 })
    .catch(() => {
      throw new Error("window.__pw never appeared: run npm run build:test first");
    });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

export async function scrollToEvent(page: Page, id: string): Promise<void> {
  await page.evaluate((i) => window.__pw?.scrollToEvent(i), id);
}

export async function scrollToEra(page: Page, id: EraId): Promise<void> {
  await page.evaluate((i) => window.__pw?.scrollToEra(i), id);
}

export async function scrollToSeam(page: Page, index: number, progress: number): Promise<void> {
  await page.evaluate(([i, p]) => window.__pw?.scrollToSeam(i, p), [index, progress] as const);
}

export async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((v) => window.__pw?.scrollToY(v), y);
}

export async function state(page: Page): Promise<PageState> {
  const s = await page.evaluate(() => window.__pw?.state());
  expect(s, "window.__pw.state()").toBeDefined();
  return s as PageState;
}

/** The first event matching a test, so a test names the case it needs rather than an id that may change. */
export function findEvent(
  test: (e: (typeof timeline.events)[number]) => boolean,
  what: string,
): (typeof timeline.events)[number] {
  const found = timeline.events.find(test);
  if (!found) throw new Error(`No event in the data is ${what}`);
  return found;
}

/** Waits for any face the last scroll asked for, so a picture never catches a fallback font. */
export async function fontsSettled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
