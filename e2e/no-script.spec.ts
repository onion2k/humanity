// The page for a reader without JavaScript: no engine, no HUD and no test
// API. The seams' two halves still change the skin at the midpoint, and the
// stage and its text stay out of the way rather than sit on the wrong ground.
import { expect, test } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";

const SEAMS = ERA_IDS.slice(0, -1).map((from, i) => ({ index: i, from, to: ERA_IDS[i + 1] ?? from }));

test.use({ javaScriptEnabled: false });

test("the seams still change the skin at their midpoint, with no stage text or HUD in the way", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".hud")).toBeHidden();
  for (const seam of SEAMS) {
    const el = page.locator(`[data-seam="${seam.index}"]`);
    await expect(el.locator(".seam-copy")).toHaveCSS("visibility", "hidden");
    await expect(el.locator(".seam-stage")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const halves = await el
      .locator(".seam-half")
      .evaluateAll((h) => h.map((x) => x.getAttribute("data-theme")));
    expect(halves).toEqual([seam.from, seam.to]);
  }
});
