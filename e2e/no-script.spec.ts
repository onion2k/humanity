// The page for a reader without JavaScript: no HUD and no test API. The
// chapters and the bands between them are plain HTML and CSS, so the timeline
// reads the same, just without the HUD.
import { expect, test } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";

test.use({ javaScriptEnabled: false });

test("every chapter and every band is there, and the HUD stays out of the way", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hud")).toBeHidden();
  await expect(page.locator("[data-chapter]")).toHaveCount(ERA_IDS.length);
  const bands = await page
    .locator("[data-band]")
    .evaluateAll((els) =>
      els.map((el) => [
        el.getAttribute("data-from"),
        el.getAttribute("data-to"),
        el.getBoundingClientRect().height,
      ]),
    );
  expect(bands).toEqual(ERA_IDS.slice(0, -1).map((from, i) => [from, ERA_IDS[i + 1], 160]));
});

test("the era art is drawn without a script: in the margins on a wide screen, and by each heading on a phone", async ({
  page,
  viewport,
}) => {
  await page.goto("/");
  const wide = (viewport?.width ?? 0) >= 1200;
  const shown = await page
    .locator("[data-art]")
    .evaluateAll((els) => els.filter((el) => el.checkVisibility()).map((el) => el.getAttribute("data-part")));
  const parts = wide ? ["left", "right"] : ["emblem"];
  expect(shown.sort()).toEqual(ERA_IDS.flatMap(() => parts).sort());
});
