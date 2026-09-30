// Filters and the era menu, as a reader uses them: tick reactions, regions
// and themes, see the rest dim without leaving the spine, share the address,
// and jump to any era. Each test is one of step 6's acceptance criteria.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  EMPTY_FILTER,
  countLabel,
  filterToQuery,
  isEmpty,
  matches,
  type Filter,
} from "../src/engine/filter.ts";
import { ERAS } from "../src/eras.ts";
import { findEvent, openTimeline, scrollToEra, settle, state, timeline } from "./helpers.ts";

const filter = (f: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...f });
const CASES: [string, Filter][] = [
  ["one reaction", filter({ reactions: ["wonder"] })],
  ["a reaction that is often second", filter({ reactions: ["cooperation"] })],
  [
    "a region and a theme",
    filter({ regions: ["europe"], themes: [timeline.vocabularies.themes[0]?.id ?? ""] }),
  ],
  ["two reactions in one region", filter({ reactions: ["panic", "optimism"], regions: ["north-america"] })],
];

async function setFilter(page: Page, f: Filter): Promise<void> {
  await page.evaluate((x) => window.__pw?.setFilter(x), f);
}

function expectedDimmed(f: Filter): string[] {
  if (isEmpty(f)) return [];
  return timeline.events.filter((e) => !matches(e, f)).map((e) => e.id);
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("a filter dims exactly the events that do not match, and the count says how many do", async ({
  page,
}) => {
  for (const [name, f] of CASES) {
    await setFilter(page, f);
    const s = await state(page);
    const dimmed = expectedDimmed(f);
    expect(s.dimmed, name).toEqual(dimmed);
    expect(dimmed.length, `${name} should dim something`).toBeGreaterThan(0);
    expect(s.count, name).toBe(
      countLabel(timeline.events.length - dimmed.length, timeline.events.length, false),
    );
  }
  await setFilter(page, EMPTY_FILTER);
  const cleared = await state(page);
  expect(cleared.dimmed).toEqual([]);
  expect(cleared.count).toBe(countLabel(timeline.events.length, timeline.events.length, true));
});

test("a filter that matches nothing dims every event and says how to get them back", async ({ page }) => {
  const lonely = timeline.vocabularies.regions.find(
    (r) => !timeline.events.some((e) => e.regions.includes(r.id) && e.reactions.includes("complacency")),
  );
  await setFilter(page, filter({ reactions: ["complacency"], regions: [lonely?.id ?? ""] }));
  const s = await state(page);
  expect(s.dimmed).toHaveLength(timeline.events.length);
  expect(s.count).toBe(countLabel(0, timeline.events.length, false));
});

test("dimmed events stay on the spine, in the tab order, and come back to full strength on focus", async ({
  page,
}) => {
  await setFilter(page, filter({ reactions: ["wonder"] }));
  expect((await state(page)).eventCount).toBe(timeline.events.length);
  const row = findEvent((e) => !e.featured && !e.reactions.includes("wonder"), "a row that is not wonder");
  const summary = page.locator(`[data-event="${row.id}"] summary`);
  await expect(page.locator(`[data-event="${row.id}"]`)).toHaveAttribute("data-dimmed", "");
  expect(await summary.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(0);
  await summary.focus();
  await expect(page.locator(`[data-event="${row.id}"]`)).toHaveCSS("opacity", "1");
  await page.locator("body").focus();
  await page.mouse.move(0, 0);
  await summary.evaluate((el) => {
    (el as HTMLElement).blur();
  });
  await expect(page.locator(`[data-event="${row.id}"]`)).toHaveCSS("opacity", "0.3");
});

test("the filter is kept in the address, and a shared address opens with the same events undimmed", async ({
  page,
}) => {
  const f = filter({ reactions: ["panic"], regions: ["europe"] });
  await setFilter(page, f);
  expect(new URL(page.url()).search).toBe(filterToQuery(f));
  const history = await page.evaluate(() => window.history.length);
  await setFilter(page, filter({ reactions: ["panic"] }));
  expect(await page.evaluate(() => window.history.length), "no history entry per tick").toBe(history);

  await page.goto(`/${filterToQuery(f)}&region=atlantis&utm_source=x`);
  await page.waitForFunction(() => window.__pw !== undefined);
  const s = await state(page);
  expect(s.filter).toEqual(f);
  expect(s.dimmed).toEqual(expectedDimmed(f));
});

test("the panel opens and closes from the keyboard, and the boxes work with Space", async ({ page }) => {
  // By keyboard alone, as a reader without a pointer goes: Tab to the button, Enter, and Tab on into the panel.
  const button = page.locator("button.filter-toggle");
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  expect((await state(page)).panelOpen).toBe(true);
  await page.keyboard.press("Tab");
  const first = timeline.vocabularies.reactions[0]?.id ?? "";
  await expect(page.locator(`input[name="reaction"][value="${first}"]`)).toBeFocused();
  await page.keyboard.press("Space");
  expect((await state(page)).filter.reactions).toEqual([first]);
  await page.keyboard.press("Escape");
  expect((await state(page)).panelOpen).toBe(false);
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("with the panel open, Tab goes from its button through the panel in the order it is shown, and Shift+Tab comes back", async ({
  page,
}) => {
  const button = page.locator("button.filter-toggle");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  // What the panel shows, top to bottom, read from the page, so a new box or era joins the walk without a word here.
  const shown = await page
    .locator("#filter-panel :is(input, button, a)")
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute("value") ?? el.getAttribute("href") ?? el.textContent.trim()),
    );
  const { reactions, regions, themes } = timeline.vocabularies;
  expect(shown).toHaveLength(reactions.length + regions.length + themes.length + 1 + ERAS.length);
  const walked: { what: string; inPanel: boolean; ring: string }[] = [];
  for (let i = 0; i < shown.length; i++) {
    await page.keyboard.press("Tab");
    walked.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        const s = el ? getComputedStyle(el) : null;
        return {
          what: el?.getAttribute("value") ?? el?.getAttribute("href") ?? el?.textContent.trim() ?? "",
          inPanel: el?.closest("#filter-panel") !== null,
          ring: `${s?.outlineStyle ?? ""} ${s?.outlineWidth ?? ""}`,
        };
      }),
    );
  }
  expect(walked.map((stop) => stop.what)).toEqual(shown);
  expect(walked.filter((stop) => !stop.inPanel || stop.ring !== "solid 2px")).toEqual([]);
  for (let i = 0; i < shown.length; i++) await page.keyboard.press("Shift+Tab");
  await expect(button).toBeFocused();
  expect((await state(page)).panelOpen).toBe(true);
});

test("every checkbox has a label a screen reader will read, and reactions keep their shape", async ({
  page,
}) => {
  await page.locator("button.filter-toggle").click();
  const unlabelled = await page
    .locator(".filter-panel input[type=checkbox]")
    .evaluateAll(
      (boxes) => boxes.filter((b) => (b.closest("label")?.textContent ?? "").trim() === "").length,
    );
  expect(unlabelled).toBe(0);
  await expect(page.locator('.filter-panel input[name="reaction"]')).toHaveCount(
    timeline.vocabularies.reactions.length,
  );
  await expect(page.locator('.filter-panel input[name="region"]')).toHaveCount(
    timeline.vocabularies.regions.length,
  );
  await expect(page.locator('.filter-panel input[name="theme"]')).toHaveCount(
    timeline.vocabularies.themes.length,
  );
  await expect(page.locator('.filter-panel label:has(input[name="reaction"]) svg path')).toHaveCount(
    timeline.vocabularies.reactions.length,
  );
});

test("the era menu jumps to each era's chapter, and the HUD agrees on arrival", async ({ page }) => {
  for (const era of ERAS) {
    await page.locator("button.filter-toggle").click();
    await page.locator(`.era-menu a[href="#era-${era.id}"]`).click();
    await settle(page);
    const s = await state(page);
    expect(s.panelOpen, era.id).toBe(false);
    const top = await page.locator(`#era-${era.id}`).evaluate((h) => h.getBoundingClientRect().top);
    expect(top, era.id).toBeGreaterThanOrEqual(0);
    expect(top, era.id).toBeLessThan(200);
    expect(s.hud?.theme, era.id).toBe(era.id);
  }
});

test("the era menu gives each era its swatch, span and count", async ({ page }) => {
  await page.locator("button.filter-toggle").click();
  for (const era of ERAS) {
    const link = page.locator(`.era-menu a[href="#era-${era.id}"]`);
    const count = timeline.events.filter((e) => e.era === era.id).length;
    await expect(link).toContainText(era.name);
    await expect(link).toContainText(`${count} events`);
    await expect(link.locator(".swatch")).toHaveCSS("background-color", /rgb/);
  }
});

test("axe finds nothing with the panel open, and nothing but dimmed events with a filter set", async ({
  page,
}) => {
  for (const era of ["antiquity", "industrial", "digital"] as const) {
    await scrollToEra(page, era);
    await page.locator("button.filter-toggle").click();
    const open = await new AxeBuilder({ page }).include(".filter-panel").analyze();
    expect(
      open.violations.map((v) => v.id),
      era,
    ).toEqual([]);
    await page.keyboard.press("Escape");
  }
  await setFilter(page, filter({ reactions: ["wonder"] }));
  await scrollToEra(page, "digital");
  const filtered = await new AxeBuilder({ page })
    .include('[data-chapter="digital"]')
    .exclude("[data-dimmed]")
    .analyze();
  expect(filtered.violations.map((v) => v.id)).toEqual([]);
});

test("on a phone the Filter button sits at the bottom right, and its panel opens above it, leaving it to close with", async ({
  page,
}, info) => {
  const button = page.locator("button.filter-toggle");
  const box = await button.boundingBox();
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  if (info.project.name !== "phone") {
    const hud = await page.locator(".hud").boundingBox();
    expect(Math.abs((box?.y ?? 0) - (hud?.y ?? 0)), "beside the HUD on a wide screen").toBeLessThan(1);
    return;
  }
  expect(viewport.height - ((box?.y ?? 0) + (box?.height ?? 0)), "near the bottom").toBeLessThan(40);
  expect(viewport.width - ((box?.x ?? 0) + (box?.width ?? 0)), "at the right").toBeLessThan(40);
  expect(box?.height ?? 0, "a thumb-sized target").toBeGreaterThanOrEqual(44);
  await button.click();
  const panel = await page.locator("#filter-panel").boundingBox();
  expect((panel?.y ?? 0) + (panel?.height ?? 0), "the panel ends above the button").toBeLessThanOrEqual(
    box?.y ?? 0,
  );
  await button.click();
  expect((await state(page)).panelOpen).toBe(false);
});

test("on a phone only the HUD sits at the top, so it covers less than half the width", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "The phone layout.");
  const width = page.viewportSize()?.width ?? 0;
  const covered = await page.evaluate(() =>
    [...document.querySelectorAll(".hud, .filter-toggle")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.top < 100)
      .reduce((sum, r) => sum + r.width, 0),
  );
  expect(covered).toBeLessThan(width / 2);
});

test("the chrome keeps square corners in every era, and the Filter button carries the era's accent rule", async ({
  page,
}) => {
  await page.locator(".filter-toggle").click();
  for (const era of ERAS) {
    await scrollToEra(page, era.id);
    const look = await page.evaluate(() => {
      const radius = (selector: string): string => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).borderTopLeftRadius : "missing";
      };
      const toggle = document.querySelector(".filter-toggle");
      if (!toggle) throw new Error("no Filter button");
      // The accent is read through a probe inside the button, so it is resolved in the same skin the button wears.
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      toggle.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      const style = getComputedStyle(toggle);
      return {
        hud: radius(".hud"),
        toggle: radius(".filter-toggle"),
        panel: radius(".filter-panel"),
        rule: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
        accent,
      };
    });
    expect({ hud: look.hud, toggle: look.toggle, panel: look.panel }, era.id).toEqual({
      hud: "0px",
      toggle: "0px",
      panel: "0px",
    });
    expect(look.rule, era.id).toBe(`2px solid ${look.accent}`);
  }
});
