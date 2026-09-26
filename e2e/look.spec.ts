// The pictures the page is held to: the intro, the start of every chapter,
// five points through every seam, and each edge case from the checklist on a card
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

/** Through each seam: the earlier era with its text, into the blend, the midpoint, out of it, and the later era. */
const SEAM_POINTS = [0.15, 0.4, 0.5, 0.6, 0.85];

for (let i = 0; i < ERA_IDS.length - 1; i++) {
  for (const raw of SEAM_POINTS) {
    test(`the seam from ${ERA_IDS[i]} to ${ERA_IDS[i + 1]}, ${Math.round(raw * 100)}% through`, async ({
      page,
    }) => {
      await scrollToSeam(page, i, raw);
      await picture(page, `seam-${ERA_IDS[i]}-${ERA_IDS[i + 1]}-${String(raw * 100).padStart(2, "0")}`);
    });
  }
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
    // Leave a little of what comes before in view, so the picture shows the event in its place on the spine.
    await scrollToEvent(page, e.id, 120);
    await picture(page, name);
  });
}

test("the end of the page", async ({ page }) => {
  await scrollToY(page, 1e9);
  await picture(page, "end");
});

test.describe("under reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openTimeline(page);
  });

  for (let i = 0; i < ERA_IDS.length - 1; i++) {
    for (const raw of [0.45, 0.55]) {
      test(`the seam from ${ERA_IDS[i]} to ${ERA_IDS[i + 1]}, ${Math.round(raw * 100)}% through`, async ({
        page,
      }) => {
        await scrollToSeam(page, i, raw);
        await picture(page, `reduced-seam-${ERA_IDS[i]}-${ERA_IDS[i + 1]}-${Math.round(raw * 100)}`);
      });
    }
  }
});

test.describe("filters", () => {
  for (const era of ["antiquity", "industrial", "digital"] as const) {
    test(`the panel open in ${era}`, async ({ page }) => {
      await scrollToEra(page, era);
      await page.locator("button.filter-toggle").click();
      await picture(page, `panel-${era}`);
    });
  }

  test("a chapter with a filter set", async ({ page }) => {
    await page.evaluate(() =>
      window.__pw?.setFilter({ reactions: ["wonder", "optimism"], regions: [], themes: [] }),
    );
    await scrollToEra(page, "machine");
    await picture(page, "filtered-machine");
  });

  test("a filter that matches nothing", async ({ page }) => {
    await page.evaluate(() =>
      window.__pw?.setFilter({
        reactions: ["humour"],
        regions: [],
        themes: ["nuclear-weapons", "space-exploration"],
      }),
    );
    await scrollToEra(page, "atomic");
    await page.locator("button.filter-toggle").click();
    await picture(page, "filtered-nothing");
  });

  test("a dimmed row with focus, back at full strength", async ({ page }) => {
    await page.evaluate(() => window.__pw?.setFilter({ reactions: ["wonder"], regions: [], themes: [] }));
    const row = findEvent(
      (e) => !e.featured && e.era === "industrial" && !e.reactions.includes("wonder"),
      "an industrial row",
    );
    await scrollToEvent(page, row.id, 200);
    await page.locator(`[data-event="${row.id}"] summary`).focus();
    await picture(page, "filtered-focus");
  });
});
