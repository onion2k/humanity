// The page for a reader who has asked for less motion: each change of era
// happens at once at the seam's midpoint, with no blend and no crossfade, and
// nothing on the page animates. Each test is one of step 5's acceptance
// criteria.
import { expect, test } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";
import { contrastRatio } from "../src/tokens/contrast.ts";
import { loadTokens, resolveColour } from "../src/tokens/tokens.ts";
import { openTimeline, scrollToEra, scrollToSeam, state } from "./helpers.ts";

const tokens = loadTokens();
const SEAMS = ERA_IDS.slice(0, -1).map((from, i) => ({ index: i, from, to: ERA_IDS[i + 1] ?? from }));
const POINTS = [0.2, 0.35, 0.45, 0.49, 0.51, 0.55, 0.65, 0.8];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTimeline(page);
});

test("each seam switches all at once at its midpoint, onto one era's ground and never a mix", async ({
  page,
}) => {
  for (const seam of SEAMS) {
    for (const raw of POINTS) {
      await scrollToSeam(page, seam.index, raw);
      const s = (await state(page)).seam;
      const era = raw < 0.5 ? seam.from : seam.to;
      const where = `${seam.from}→${seam.to} at ${raw}`;
      expect([s?.pc, s?.pi, s?.theme], where).toEqual(raw < 0.5 ? [0, 0, era] : [1, 1, era]);
      expect(s?.background, where).toBe(resolveColour(tokens, "ground", era));
      expect((await state(page)).hud?.theme, where).toBe(era);
    }
  }
});

test("the big year shows in one face only, and the caption stays readable through the switch", async ({
  page,
}) => {
  for (const seam of SEAMS) {
    for (const raw of POINTS) {
      await scrollToSeam(page, seam.index, raw);
      const s = (await state(page)).seam;
      const where = `${seam.from}→${seam.to} at ${raw}`;
      const opacity = (layer: string): number | undefined => s?.text.find((t) => t.layer === layer)?.opacity;
      expect([opacity("year-from"), opacity("year-to")], where).toEqual(raw < 0.5 ? [1, 0] : [0, 1]);
      const caption = s?.text.find((t) => t.layer === "caption");
      expect(caption?.opacity, where).toBe(1);
      expect(contrastRatio(caption?.colour ?? "", s?.background ?? ""), where).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("nothing on the page animates, anywhere", async ({ page }) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    expect(await page.evaluate(() => document.getAnimations().length), era).toBe(0);
  }
  for (const seam of SEAMS) {
    await scrollToSeam(page, seam.index, 0.5);
    expect(await page.evaluate(() => document.getAnimations().length), `seam ${seam.index}`).toBe(0);
  }
});

test("turning reduced motion off and on mid-seam takes effect on the next frame", async ({ page }) => {
  await scrollToSeam(page, 3, 0.4);
  expect((await state(page)).seam?.pc).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const blending = (await state(page)).seam?.pc ?? 0;
  expect(blending).toBeGreaterThan(0);
  expect(blending).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect((await state(page)).seam?.pc).toBe(0);
});
