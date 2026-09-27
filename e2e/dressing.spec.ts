// The era textures on the page: each chapter's events sit on its own era's
// texture, and its heading never does.
import { expect, test } from "@playwright/test";
import { TEXTURES } from "../src/dressing.ts";
import { ERA_IDS } from "../src/eras.ts";
import { loadTokens, resolveColour } from "../src/tokens/tokens.ts";
import { openTimeline, scrollToEra } from "./helpers.ts";

const tokens = loadTokens();

function hexOf(rgb: string): string {
  const parts = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  return `#${(parts?.slice(1, 4) ?? []).map((p) => Number(p).toString(16).padStart(2, "0")).join("")}`;
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("each chapter's events sit on its own era's texture, in its rule colour, at its strength", async ({
  page,
}) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    const texture = await page.locator(`[data-chapter="${era}"] .track`).evaluate((track) => {
      const s = getComputedStyle(track, "::before");
      return { mask: s.maskImage, colour: s.backgroundColor, opacity: Number(s.opacity) };
    });
    expect(texture.mask, era).toContain("data:image/svg+xml");
    expect(hexOf(texture.colour), era).toBe(resolveColour(tokens, "rule", era));
    expect(texture.opacity, era).toBeCloseTo(TEXTURES[era].strength, 5);
  }
});

test("the chapter heading sits on plain ground, clear of the texture", async ({ page }) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    const overlap = await page.locator(`[data-chapter="${era}"]`).evaluate((chapter) => {
      const head = chapter.querySelector(".chapter-head h2")?.getBoundingClientRect();
      const track = chapter.querySelector(".track")?.getBoundingClientRect();
      return head && track ? head.bottom > track.top : true;
    });
    expect(overlap, era).toBe(false);
  }
});
