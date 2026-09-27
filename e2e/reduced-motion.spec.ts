// The page for a reader who has asked for less motion. With the seams gone,
// nothing on the page moves at all: each band is a still blend of colour, and
// a jump to an era lands at once rather than gliding.
import { expect, test } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";
import { openTimeline, scrollToBand, scrollToEra } from "./helpers.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTimeline(page);
});

test("nothing on the page animates, anywhere", async ({ page }) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    expect(await page.evaluate(() => document.getAnimations().length), era).toBe(0);
  }
  for (let i = 0; i < ERA_IDS.length - 1; i++) {
    await scrollToBand(page, i, 0.5);
    expect(await page.evaluate(() => document.getAnimations().length), `band ${i}`).toBe(0);
  }
});

test("scrolling is instant, not smooth, so a jump to an era does not glide", async ({ page }) => {
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});
