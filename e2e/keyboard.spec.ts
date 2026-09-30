// The accessibility pass: the whole page by keyboard, and exactly what a
// screen reader is given. Tab from the top reaches the Filter button first and
// then every row in page order, each with its focus ring and clear of the
// fixed chrome. The snapshots pin what is read out for each kind of thing, so
// a change that makes a reaction silent, or a decoration noisy, fails here.
import { expect, test, type Page } from "@playwright/test";
import { EMPTY_FILTER } from "../src/engine/filter.ts";
import { findEvent, openTimeline, scrollToEra, scrollToEvent, settle, timeline } from "./helpers.ts";

const rows = timeline.events.filter((e) => !e.featured).map((e) => e.id);

interface Stop {
  what: string;
  ring: string;
  onScreen: boolean;
  clearOfChrome: boolean;
}

async function focused(page: Page): Promise<Stop> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { what: "body", ring: "", onScreen: false, clearOfChrome: false };
    const box = el.getBoundingClientRect();
    // The chrome is the HUD and the Filter button, which on a phone sit at opposite ends of the screen.
    // The chrome is the HUD and the Filter button, which on a phone sit at opposite ends of the screen.
    const chrome = [...document.querySelectorAll(".hud, .filter-toggle")].map((c) =>
      c.getBoundingClientRect(),
    );
    const s = getComputedStyle(el);
    const what = el.closest("[data-event]")?.getAttribute("data-event") ?? el.className;
    const overlaps = chrome.some(
      (c) => !(box.bottom <= c.top || box.top >= c.bottom || box.right <= c.left || box.left >= c.right),
    );
    return {
      what,
      ring: `${s.outlineStyle} ${s.outlineWidth}`,
      // The ring sits 2px out from the element and is 2px wide, so all of it must be on screen too.
      onScreen: box.top - 4 >= 0 && box.bottom + 4 <= window.innerHeight,
      clearOfChrome: el.closest(".chrome") !== null || !overlaps,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("Tab reaches the Filter button first, then every row in order, each ringed, on screen and clear of the chrome", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.keyboard.press("Tab");
  const first = await focused(page);
  expect(first.what).toBe("filter-toggle");
  const stops: Stop[] = [];
  for (let i = 0; i < rows.length; i++) {
    await page.keyboard.press("Tab");
    // Focus scrolls smoothly unless the reader asks for less motion, so each stop is judged once the page is still.
    await settle(page);
    stops.push(await focused(page));
  }
  expect(stops.map((s) => s.what)).toEqual(rows);
  const bad = stops.filter((s) => s.ring !== "solid 2px" || !s.onScreen || !s.clearOfChrome);
  expect(bad).toEqual([]);
  await page.keyboard.press("Tab");
  expect((await focused(page)).what, "nothing after the last row but the page's end").toBe("body");
});

test("Shift+Tab back up the page stops each row below the fixed chrome", async ({ page }) => {
  await scrollToEra(page, "digital");
  const start = findEvent((e) => e.era === "digital" && !e.featured, "a digital row");
  await page.locator(`[data-event="${start.id}"] summary`).focus();
  const bad: Stop[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Shift+Tab");
    await settle(page);
    const stop = await focused(page);
    if (stop.ring !== "solid 2px" || !stop.onScreen || !stop.clearOfChrome) bad.push(stop);
  }
  expect(bad).toEqual([]);
});

test("a filter dims rows but leaves every one in the tab order", async ({ page }) => {
  await page.evaluate(() => window.__pw?.setFilter({ reactions: ["wonder"], regions: [], themes: [] }));
  const reachable = await page
    .locator("details.event-row > summary")
    .evaluateAll((s) => s.filter((el) => (el as HTMLElement).tabIndex === 0).length);
  expect(reachable).toBe(rows.length);
  await page.evaluate((f) => window.__pw?.setFilter(f), EMPTY_FILTER);
});

test("a screen reader hears a card's reactions as words, its date as written, and no decoration", async ({
  page,
}) => {
  const card = findEvent((e) => e.id === "1858-transatlantic-telegraph-cable", "the telegraph card");
  await scrollToEvent(page, card.id, 100);
  await expect(page.locator(`[data-event="${card.id}"]`)).toMatchAriaSnapshot(`
    - article:
      - text: Celebration Optimism 1858
      - heading "Transatlantic telegraph cable" [level=3]
      - paragraph: Queen Victoria and President Buchanan exchanged messages, New York's celebratory fireworks set City Hall alight, and the cable failed within weeks.
      - text: North America Europe Communication
  `);
});

test("a screen reader hears a row's reaction, date and title, and on opening its story, reactions and tags", async ({
  page,
}) => {
  const row = "1783-first-balloon-flights";
  await scrollToEvent(page, row, 100);
  await expect(page.locator(`[data-event="${row}"]`)).toMatchAriaSnapshot(`
    - group: Wonder · 1783 First balloon flights
  `);
  await page.locator(`[data-event="${row}"] summary`).click();
  await expect(page.locator(`[data-event="${row}"]`)).toMatchAriaSnapshot(`
    - group:
      - text: Wonder · 1783 First balloon flights
      - paragraph: The Montgolfier brothers' hot-air balloon and Jacques Charles's hydrogen balloon drew vast crowds in France.
      - text: Wonder Celebration Europe Energy & transport
  `);
});

test("a screen reader finds each era as a heading with its span, and the Filter button by name", async ({
  page,
}) => {
  await scrollToEra(page, "industrial");
  await expect(page.locator('[data-chapter="industrial"] .chapter-head')).toMatchAriaSnapshot(`
    - heading "Industrial" [level=2]
    - paragraph: 1780–1900 · 36 events
  `);
  await expect(page.locator(".chrome")).toMatchAriaSnapshot(`
    - button "Filter"
  `);
});

test("a screen reader is given the open panel straight after its button, before the rest of the page", async ({
  page,
}) => {
  await page.locator("button.filter-toggle").click();
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - button "Filter" [expanded]
    - region "Filter events"
    - banner
    - main
    - contentinfo
  `);
});

test("after focusing a row, scrolling away with the wheel is never undone", async ({ page }) => {
  const row = findEvent((e) => e.era === "machine" && !e.featured, "a machine row");
  // The row sits under the chrome, so the page means to bring it clear; but before it can, the reader scrolls 700px
  // on with the wheel. That is less than a screen, so only the reader's move tells the page to leave it be.
  await scrollToEvent(page, row.id, 10);
  const before = await page.evaluate((id) => {
    const summary = document.querySelector<HTMLElement>(`[data-event="${id}"] > summary`);
    summary?.focus({ preventScroll: true });
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 700 }));
    window.scrollBy({ top: 700, behavior: "instant" });
    return window.scrollY;
  }, row.id);
  await settle(page);
  await settle(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});
