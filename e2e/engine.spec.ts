// The scroll engine, as the reader meets it: each seam's ground blending in
// oklab as they scroll, text colours and the HUD switching at the midpoint,
// seam text fading before it could become hard to read, and the HUD showing
// the year of what they are reading. Each test is one of step 4's
// acceptance criteria.
import { expect, test } from "@playwright/test";
import { blendAt } from "../src/engine/blend.ts";
import { formatYear, READING_LINE } from "../src/engine/reading.ts";
import { ERAS, ERA_IDS } from "../src/eras.ts";
import { contrastRatio } from "../src/tokens/contrast.ts";
import { hexToOklab, mixOklab } from "../src/tokens/oklab.ts";
import { loadTokens, resolveColour } from "../src/tokens/tokens.ts";
import { findEvent, openTimeline, scrollToEvent, scrollToSeam, scrollToY, state } from "./helpers.ts";

const tokens = loadTokens();
const SEAMS = ERA_IDS.slice(0, -1).map((from, i) => ({ index: i, from, to: ERA_IDS[i + 1] ?? from }));

/** The test API already reports drawn colours as #rrggbb; this keeps a bad reading from passing quietly. */
function hex(colour: string): string {
  if (!/^#[0-9a-f]{6}$/.test(colour)) throw new Error(`Cannot read ${colour}`);
  return colour;
}

/** How far apart two colours are in oklab. 0.01 is below what anyone can see. */
function distance(a: string, b: string): number {
  const [x, y] = [hexToOklab(a), hexToOklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("each seam's ground is the oklab mix of its two eras' grounds, eased over the middle of the seam", async ({
  page,
}) => {
  for (const seam of SEAMS) {
    for (const raw of [0.1, 0.35, 0.45, 0.55, 0.65, 0.9]) {
      await scrollToSeam(page, seam.index, raw);
      const s = (await state(page)).seam;
      expect(s?.index, `${seam.from}→${seam.to} at ${raw}`).toBe(seam.index);
      const pc = s?.pc ?? -1;
      expect(Math.abs(pc - blendAt(raw).pc), `${seam.from}→${seam.to} at ${raw}`).toBeLessThan(0.02);
      const expected = mixOklab(
        resolveColour(tokens, "ground", seam.from),
        resolveColour(tokens, "ground", seam.to),
        pc,
      );
      expect(distance(hex(s?.background ?? ""), expected), `${seam.from}→${seam.to} at ${raw}`).toBeLessThan(
        0.01,
      );
    }
  }
});

test("text and the HUD switch to the next era exactly at the midpoint", async ({ page }) => {
  for (const seam of SEAMS) {
    await scrollToSeam(page, seam.index, 0.49);
    let s = await state(page);
    expect([s.seam?.pi, s.seam?.theme, s.hud?.theme], `${seam.from}→${seam.to} before`).toEqual([
      0,
      seam.from,
      seam.from,
    ]);
    await scrollToSeam(page, seam.index, 0.51);
    s = await state(page);
    expect([s.seam?.pi, s.seam?.theme, s.hud?.theme], `${seam.from}→${seam.to} after`).toEqual([
      1,
      seam.to,
      seam.to,
    ]);
  }
});

test("no text on a seam shows while the ground under it would take it below its ratio", async ({ page }) => {
  const min: Record<string, number> = { caption: 4.5, "year-from": 3, "year-to": 3 };
  const problems: string[] = [];
  for (const seam of SEAMS) {
    for (let k = 0; k <= 40; k++) {
      const raw = 0.25 + (k / 40) * 0.5;
      await scrollToSeam(page, seam.index, raw);
      const s = (await state(page)).seam;
      expect(s, `${seam.from}→${seam.to} at ${raw.toFixed(3)} has no seam state`).not.toBeNull();
      if (!s) continue;
      expect(s.text.length).toBe(3);
      for (const t of s.text) {
        if (t.opacity === 0) continue;
        const ratio = contrastRatio(hex(t.colour), hex(s.background));
        if (ratio < (min[t.layer] ?? 4.5)) {
          problems.push(`${seam.from}→${seam.to} at ${raw.toFixed(3)}: ${t.layer} ${ratio.toFixed(2)}:1`);
        }
      }
    }
  }
  expect(problems).toEqual([]);
});

test("every seam shows its caption and big year before the blend, and the next era's after", async ({
  page,
}) => {
  const { seams } = (await import("./helpers.ts")).timeline;
  for (const seam of SEAMS) {
    await scrollToSeam(page, seam.index, 0.1);
    const before = (await state(page)).seam;
    expect(before?.text.find((t) => t.layer === "caption")?.opacity, seam.from).toBe(1);
    expect(before?.text.find((t) => t.layer === "year-from")?.opacity, seam.from).toBeGreaterThan(0.9);
    const caption = await page.locator(`[data-seam="${seam.index}"] .seam-caption`).textContent();
    expect(caption).toBe(seams[seam.index]?.caption?.text);
    const year = await page.locator(`[data-seam="${seam.index}"] .seam-year`).first().textContent();
    expect(year).toBe(formatYear(ERAS[seam.index + 1]?.from ?? 0));
    await scrollToSeam(page, seam.index, 0.9);
    const after = (await state(page)).seam;
    expect(after?.text.find((t) => t.layer === "caption")?.opacity, seam.to).toBe(1);
    expect(after?.text.find((t) => t.layer === "year-to")?.opacity, seam.to).toBeGreaterThan(0.9);
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
    // Put the event's top just above the reading line.
    await scrollToEvent(page, e.id, vh * READING_LINE - 2);
    const s = await state(page);
    expect(s.hud?.year, e.id).toBe(formatYear(e.year.start));
    expect(s.hud?.theme, e.id).toBe(e.era);
  }
});

test("the HUD shows the timeline's first year above the first event, and the next era's first year after a seam", async ({
  page,
}) => {
  await scrollToY(page, 0);
  const first = (await import("./helpers.ts")).timeline.events[0];
  expect((await state(page)).hud?.year).toBe(formatYear(first?.year.start ?? 0));
  await scrollToSeam(page, 3, 0.6);
  expect((await state(page)).hud?.year).toBe(formatYear(ERAS[4]?.from ?? 0));
});

test("the HUD names the era, and is hidden from screen readers, which have the chapter headings", async ({
  page,
}) => {
  await scrollToSeam(page, 3, 0.9);
  const s = await state(page);
  expect(s.hud?.era).toBe(ERAS[4]?.name);
  await expect(page.locator(".hud")).toHaveAttribute("aria-hidden", "true");
});
