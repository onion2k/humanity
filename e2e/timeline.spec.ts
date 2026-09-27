// The timeline, as a reader meets it: every event on the spine once, in its
// era's skin, cards either side and rows across, and rows that open from the
// keyboard. Each test is one of step 3's acceptance criteria.
import { expect, test } from "@playwright/test";
import { rowMeta } from "../src/data/chapters.ts";
import { ERA_IDS } from "../src/eras.ts";
import { findEvent, openTimeline, scrollToEra, scrollToEvent, state, timeline } from "./helpers.ts";

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("every event is on the page once, in order, as a card if featured and a row if not", async ({
  page,
}) => {
  const shown = await page.locator("[data-event]").evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-event"),
      tag: el.tagName,
      cls: el.getAttribute("class"),
    })),
  );
  expect(shown.map((s) => s.id)).toEqual(timeline.events.map((e) => e.id));
  for (const [i, e] of timeline.events.entries()) {
    const s = shown[i];
    if (e.featured) expect([s?.tag, s?.cls], e.id).toEqual(["ARTICLE", "event-card"]);
    else expect([s?.tag, s?.cls], e.id).toEqual(["DETAILS", "event-row"]);
  }
  expect((await state(page)).eventCount).toBe(timeline.events.length);
});

test("each chapter, and every event in it, wears its own era's skin", async ({ page }) => {
  const chapters = await page
    .locator("[data-chapter]")
    .evaluateAll((els) => els.map((el) => [el.getAttribute("data-chapter"), el.getAttribute("data-theme")]));
  expect(chapters).toEqual(ERA_IDS.map((id) => [id, id]));
  const themes = await page
    .locator("[data-event]")
    .evaluateAll((els) => els.map((el) => el.closest("[data-theme]")?.getAttribute("data-theme")));
  expect(themes).toEqual(timeline.events.map((e) => e.era));
});

test("cards sit either side of the spine on a wide screen, and right of it at the left edge on a phone", async ({
  page,
}, info) => {
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    const spine = await page.locator(`[data-chapter="${era}"] .spine`).boundingBox();
    expect(spine, era).not.toBeNull();
    const spineX = (spine?.x ?? 0) + (spine?.width ?? 0) / 2;
    const cards = await page.locator(`[data-chapter="${era}"] .event-card`).evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return { side: el.getAttribute("data-side"), left: box.left, right: box.right };
      }),
    );
    for (const c of cards) {
      if (info.project.name === "phone") {
        expect(c.left, era).toBeGreaterThan(spineX);
      } else if (c.side === "left") {
        expect(c.right, era).toBeLessThan(spineX);
      } else {
        expect(c.left, era).toBeGreaterThan(spineX);
      }
    }
    if (info.project.name === "phone") expect(spineX, era).toBeLessThan(40);
    else expect(Math.abs(spineX - 640), era).toBeLessThan(2);
  }
});

test("a card shows every reaction as shape and word, the date as written, the title, body and tags", async ({
  page,
}) => {
  const e = findEvent((x) => x.featured && x.reactions.length > 1, "a featured event with two reactions");
  await scrollToEvent(page, e.id);
  const card = page.locator(`[data-event="${e.id}"]`);
  await expect(card.locator(".reaction")).toHaveCount(e.reactions.length);
  for (const r of await card.locator(".reaction").all()) await expect(r.locator("svg path")).toHaveCount(1);
  await expect(card.locator(".event-date")).toHaveText(e.date);
  await expect(card.locator("h3")).toHaveText(e.title);
  await expect(card.locator(".event-body")).toHaveText(e.body);
  await expect(card.locator(".verdict")).toHaveCount(e.verdict ? 1 : 0);
  const tags = await card.locator(".tag").allTextContents();
  expect(tags.length).toBeGreaterThan(0);
  expect(tags.length).toBeLessThanOrEqual(3);
});

test("a closed row shows the main reaction and date, the mark and the title, and opens to the rest", async ({
  page,
}) => {
  const e = findEvent((x) => !x.featured && x.reactions.length > 1, "a row with two reactions");
  await scrollToEvent(page, e.id);
  const row = page.locator(`[data-event="${e.id}"]`);
  await expect(row.locator("summary .row-meta")).toHaveText(rowMeta(e));
  await expect(row.locator("summary .row-title")).toHaveText(e.title);
  await expect(row.locator("summary svg path")).toHaveCount(1);
  await expect(row.locator(".event-body")).toBeHidden();
  await row.locator("summary").click();
  await expect(row.locator(".event-body")).toBeVisible();
  await expect(row.locator(".event-body")).toHaveText(e.body);
  await expect(row.locator(".row-more .reaction")).toHaveCount(e.reactions.length);
  expect((await state(page)).openRows).toEqual([e.id]);
});

test("no event shows more than three tags", async ({ page }) => {
  const counts = await page
    .locator("[data-event]")
    .evaluateAll((els) => els.map((el) => el.querySelectorAll(".tag").length));
  expect(Math.max(...counts)).toBeLessThanOrEqual(3);
  expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
});

test("rows open and close from the keyboard, with the focus ring showing", async ({ page }) => {
  const e = findEvent((x) => !x.featured, "a row");
  await scrollToEvent(page, e.id);
  const summary = page.locator(`[data-event="${e.id}"] summary`);
  await summary.focus();
  await page.keyboard.press("Enter");
  expect((await state(page)).openRows).toEqual([e.id]);
  const ring = await summary.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth, s.outlineOffset];
  });
  expect(ring).toEqual(["solid", "2px", "2px"]);
  await page.keyboard.press("Space");
  expect((await state(page)).openRows).toEqual([]);
});

test("nothing makes the page scroll sideways, and nothing is cut off at the side", async ({ page }) => {
  await page.locator("details.event-row").evaluateAll((rows) => {
    for (const row of rows) (row as HTMLDetailsElement).open = true;
  });
  for (const era of ERA_IDS) {
    await scrollToEra(page, era);
    const [scrollWidth, width] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(scrollWidth, era).toBeLessThanOrEqual(width);
    expect((await state(page)).overflowing, era).toEqual([]);
  }
});
test("the test API puts an event at the top of the viewport and reports the era there", async ({ page }) => {
  const e = findEvent((x) => x.era === "industrial" && !x.featured, "an industrial row");
  await scrollToEvent(page, e.id);
  const top = await page.locator(`[data-event="${e.id}"]`).evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(2);
  expect((await state(page)).eraAtTop).toBe("industrial");
});

test("every date reads exactly as the export writes it, on cards and on rows", async ({ page }) => {
  // The text must be the export's, and nothing may restyle its case. Both can be read without drawing the event,
  // which matters now that each event is skipped until the reader is near it.
  const shown = await page.locator("[data-event]").evaluateAll((els) =>
    els.map((el) => {
      const date = el.querySelector<HTMLElement>(".event-date, .row-date");
      return {
        text: date?.textContent ?? "",
        transform: date ? getComputedStyle(date).textTransform : "missing",
      };
    }),
  );
  expect(shown.map((d) => d.text)).toEqual(timeline.events.map((e) => e.date));
  expect([...new Set(shown.map((d) => d.transform))]).toEqual(["none"]);
});
