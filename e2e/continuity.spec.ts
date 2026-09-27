// One continuous timeline: each era's events follow the last era's after a
// short band that blends one ground into the next, with the spine running
// unbroken from the first event to the last, and the HUD switching era at the
// middle of each band. Each test is one of the continuous change's criteria.
import { expect, test } from "@playwright/test";
import { READING_LINE, formatYear } from "../src/engine/reading.ts";
import { ERAS, ERA_IDS } from "../src/eras.ts";
import { loadTokens, resolveColour } from "../src/tokens/tokens.ts";
import {
  findEvent,
  openTimeline,
  scrollToBand,
  scrollToEra,
  scrollToEvent,
  scrollToY,
  state,
  timeline,
} from "./helpers.ts";

const tokens = loadTokens();
const BANDS = ERA_IDS.slice(0, -1).map((from, i) => ({ index: i, from, to: ERA_IDS[i + 1] ?? from }));

/** The rgb() colours in a computed style, as #rrggbb, in order. */
function colours(css: string): string[] {
  return [...css.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map(
    (m) =>
      `#${m
        .slice(1, 4)
        .map((c) => Number(c).toString(16).padStart(2, "0"))
        .join("")}`,
  );
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("there are no full-screen seams: a short band joins each pair of eras, and the next era follows within a screen", async ({
  page,
}) => {
  await expect(page.locator("[data-seam]")).toHaveCount(0);
  await expect(page.locator("[data-band]")).toHaveCount(BANDS.length);
  const vh = page.viewportSize()?.height ?? 0;
  for (const band of BANDS) {
    const gap = await page.evaluate(({ from, to, index }) => {
      const last = [...document.querySelectorAll(`[data-chapter="${from}"] .slot`)]
        .at(-1)
        ?.getBoundingClientRect();
      const heading = document
        .querySelector(`[data-chapter="${to}"] .chapter-head h2`)
        ?.getBoundingClientRect();
      const bandBox = document.querySelector(`[data-band="${index}"]`)?.getBoundingClientRect();
      return { gap: (heading?.top ?? 1e9) - (last?.bottom ?? 0), height: bandBox?.height ?? 0 };
    }, band);
    expect(Math.abs(gap.height - 160), `band ${band.index}`).toBeLessThan(1);
    expect(gap.gap, `${band.from}→${band.to}`).toBeLessThan(vh);
  }
});

test("each band blends from the earlier era's ground to the later one's, in oklab, with nothing written in it", async ({
  page,
}) => {
  for (const band of BANDS) {
    const look = await page.locator(`[data-band="${band.index}"]`).evaluate((el) => ({
      image: getComputedStyle(el).backgroundImage,
      text: el.textContent.trim(),
    }));
    expect(look.image, `band ${band.index}`).toContain("in oklab");
    expect(colours(look.image), `band ${band.index}`).toEqual([
      resolveColour(tokens, "ground", band.from),
      resolveColour(tokens, "ground", band.to),
    ]);
    expect(look.text, `band ${band.index}`).toBe("");
  }
});

test("the spine runs unbroken from the first chapter to the last, through every band, in one line", async ({
  page,
}) => {
  const pieces = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-chapter] > .spine, [data-band] > .spine")].map((el) => {
      const box = el.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, x: box.left + box.width / 2 };
    }),
  );
  expect(pieces).toHaveLength(ERA_IDS.length + BANDS.length);
  for (let i = 1; i < pieces.length; i++) {
    const [above, below] = [pieces[i - 1], pieces[i]];
    expect(Math.abs((below?.top ?? 0) - (above?.bottom ?? 0)), `piece ${i} meets the one above`).toBeLessThan(
      1,
    );
    expect(Math.abs((below?.x ?? 0) - (above?.x ?? 0)), `piece ${i} is in line`).toBeLessThan(1);
  }
});

test("each era's heading, span and caption sit clear of the spine", async ({ page }) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    const crossing = await page.locator(`[data-chapter="${era}"]`).evaluate((chapter) => {
      const spine = chapter.querySelector(":scope > .spine")?.getBoundingClientRect();
      const x = (spine?.left ?? 0) + (spine?.width ?? 0) / 2;
      return [...chapter.querySelectorAll(".chapter-head > *")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.left <= x && r.right >= x).length;
    });
    expect(crossing, era).toBe(0);
  }
});

test("each era's heading carries its caption", async ({ page }) => {
  for (const era of ERA_IDS) {
    await expect(page.locator(`[data-chapter="${era}"] .chapter-caption`), era).toHaveText(
      timeline.captions[era]?.text ?? "missing",
    );
  }
});

test("the HUD switches era and skin at the middle of each band, and shows the new era's first year", async ({
  page,
}) => {
  for (const band of BANDS) {
    await scrollToBand(page, band.index, 0.45);
    let s = await state(page);
    expect(s.hud?.theme, `${band.from}→${band.to} before`).toBe(band.from);
    await scrollToBand(page, band.index, 0.55);
    s = await state(page);
    expect(s.hud?.theme, `${band.from}→${band.to} after`).toBe(band.to);
    expect(s.hud?.year).toBe(formatYear(ERAS[band.index + 1]?.from ?? 0));
    expect(s.hud?.era).toBe(ERAS[band.index + 1]?.name);
  }
});

test("the HUD shows the year of the last event above the reading line, BC and AD included", async ({
  page,
}) => {
  const cases = [
    findEvent((e) => e.year.start < 0 && !e.featured, "a BC row"),
    findEvent((e) => e.year.start > 0 && e.year.start < 1000, "an AD event before 1000"),
    findEvent((e) => e.era === "analog" && !e.featured, "an analog row"),
    findEvent((e) => e.era === "digital" && e.featured, "a digital card"),
  ];
  const vh = page.viewportSize()?.height ?? 800;
  for (const e of cases) {
    await scrollToEvent(page, e.id, vh * READING_LINE - 2);
    const s = await state(page);
    expect(s.hud?.year, e.id).toBe(formatYear(e.year.start));
    expect(s.hud?.theme, e.id).toBe(e.era);
  }
});

test("the HUD shows the timeline's first year above the first event, and is hidden from screen readers", async ({
  page,
}) => {
  await scrollToY(page, 0);
  expect((await state(page)).hud?.year).toBe(formatYear(timeline.events[0]?.year.start ?? 0));
  await expect(page.locator(".hud")).toHaveAttribute("aria-hidden", "true");
});
