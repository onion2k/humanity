// The pictures the page is held to: the intro, the start of every chapter,
// every seam at its midpoint, and each edge case from the checklist on a card
// and on a row. A picture changes only for a change meant to move it, and
// every one written is looked at before it is kept.
import { expect, test, type Page } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";
import {
  findEvent,
  fontsSettled,
  openTimeline,
  scrollToEra,
  scrollToEvent,
  scrollToSeam,
  scrollToY,
  timeline,
} from "./helpers.ts";

async function picture(page: Page, name: string): Promise<void> {
  // A pointer left where a test clicked would hover whatever the scroll brought under it.
  await page.mouse.move(0, 0);
  await fontsSettled(page);
  await expect(page).toHaveScreenshot(`${name}.png`);
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("the intro", async ({ page }) => {
  await scrollToY(page, 0);
  await picture(page, "intro");
});

for (const era of ERA_IDS) {
  test(`the ${era} chapter opens`, async ({ page }) => {
    await scrollToEra(page, era);
    await picture(page, `chapter-${era}`);
  });
}

for (let i = 0; i < ERA_IDS.length - 1; i++) {
  test(`the seam from ${ERA_IDS[i]} to ${ERA_IDS[i + 1]}, at its midpoint`, async ({ page }) => {
    // The seam is 1.7 viewports tall, so this puts its midpoint across the middle of the screen.
    await scrollToSeam(page, i, 0.5 - 1 / (2 * 1.7));
    await picture(page, `seam-${ERA_IDS[i]}-${ERA_IDS[i + 1]}`);
  });
}

const cases = [
  ["card-two-reactions", (e) => e.featured && e.reactions.length > 1, "a card with two reactions"],
  ["card-bc-date", (e) => e.featured && e.year.start < 0, "a card with a BC date"],
  [
    "card-approximate-date",
    (e) => e.featured && e.date.startsWith("c. ") && e.year.start > 0,
    "a card with an approximate AD date",
  ],
  [
    "card-longest-title",
    (e) =>
      e.featured &&
      e.title.length === Math.max(...timeline.events.filter((x) => x.featured).map((x) => x.title.length)),
    "the card with the longest title",
  ],
  [
    "row-longest-title",
    (e) =>
      !e.featured &&
      e.title.length === Math.max(...timeline.events.filter((x) => !x.featured).map((x) => x.title.length)),
    "the row with the longest title",
  ],
  [
    "row-open-dark",
    (e) => !e.featured && e.era === "analog" && e.reactions.length > 1,
    "an analog row with two reactions",
  ],
  ["row-open-light", (e) => !e.featured && e.era === "print", "a print row"],
] as const satisfies readonly (readonly [string, (e: (typeof timeline.events)[number]) => boolean, string])[];

for (const [name, match, what] of cases) {
  test(`edge case: ${what}`, async ({ page }) => {
    const e = findEvent(match, what);
    if (name.startsWith("row-open")) await page.locator(`[data-event="${e.id}"] summary`).click();
    await scrollToEvent(page, e.id);
    // Leave a little of what comes before in view, so the picture shows the event in its place on the spine.
    const y = (await page.evaluate(() => window.scrollY)) - 120;
    await scrollToY(page, Math.max(0, y));
    await picture(page, name);
  });
}

test("the end of the page", async ({ page }) => {
  await scrollToY(page, 1e9);
  await picture(page, "end");
});
