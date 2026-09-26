// The fuzzer: a seeded reader who does only what a reader can do (scroll
// anywhere, jump to an event, open and close rows by pointer and keyboard,
// tab about, and turn a phone into a desktop and back) while the rules that
// must always hold are checked after every step. A failure prints its seed and
// the steps that led to it, so it can be replayed with FUZZ_SEED.
import { expect, test, type Page } from "@playwright/test";
import { seeded, type Random } from "../src/random.ts";
import { openTimeline, scrollToEvent, scrollToY, state, timeline } from "./helpers.ts";

const STEPS = 25;
const WIDTHS = [375, 414, 719, 720, 1024, 1280, 1440];

function seedsToRun(): number[] {
  const one = process.env.FUZZ_SEED;
  if (one !== undefined) return [Number(one)];
  const count = Number(process.env.FUZZ_SEEDS ?? "20");
  return Array.from({ length: count }, (_, i) => i + 1);
}

type Step = { name: string; run: (page: Page) => Promise<void> };

async function visibleRows(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("details.event-row")]
      .filter((row) => {
        const r = row.querySelector("summary")?.getBoundingClientRect();
        return r !== undefined && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
      })
      .map((row) => row.dataset.event ?? ""),
  );
}

/** What a reader might do next. Each choice is drawn from the seeded source, so a seed is a whole replayable run. */
async function nextStep(page: Page, random: Random): Promise<Step> {
  const kind = random.pick(["scroll", "jump", "click-row", "tab", "key", "resize"] as const);
  switch (kind) {
    case "scroll": {
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.round(random.next() * max);
      return { name: `scroll to ${y}`, run: (p) => scrollToY(p, y) };
    }
    case "jump": {
      const id = random.pick(timeline.events).id;
      return { name: `jump to ${id}`, run: (p) => scrollToEvent(p, id) };
    }
    case "click-row": {
      const rows = await visibleRows(page);
      if (rows.length === 0) return { name: "click a row (none on screen)", run: () => Promise.resolve() };
      const id = random.pick(rows);
      return { name: `click ${id}`, run: (p) => p.locator(`[data-event="${id}"] > summary`).click() };
    }
    case "tab": {
      const n = random.int(1, 5);
      const back = random.next() < 0.3;
      return {
        name: `${back ? "shift+tab" : "tab"} ×${n}`,
        run: async (p) => {
          for (let i = 0; i < n; i++) await p.keyboard.press(back ? "Shift+Tab" : "Tab");
        },
      };
    }
    case "key": {
      const key = random.pick(["Enter", "Space"] as const);
      return { name: `press ${key}`, run: (p) => p.keyboard.press(key) };
    }
    case "resize": {
      const width = random.pick(WIDTHS);
      return { name: `resize to ${width}`, run: (p) => p.setViewportSize({ width, height: 800 }) };
    }
  }
}

/** The rules no step may break. Each returns what it found wrong, or nothing. */
async function brokenRules(page: Page): Promise<string[]> {
  const expectedIds = timeline.events.map((e) => e.id);
  const { overflowing } = await state(page);
  const inPage = await page.evaluate((ids) => {
    const broken: string[] = [];
    const events = [...document.querySelectorAll<HTMLElement>("[data-event]")];
    if (events.map((e) => e.dataset.event).join() !== ids.join())
      broken.push("events missing, repeated or out of order");
    for (const e of events) {
      const theme = e.closest("[data-theme]")?.getAttribute("data-theme");
      if (theme !== e.dataset.era) broken.push(`${e.dataset.event ?? "?"} is in the ${theme ?? "no"} skin`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth) {
      broken.push(
        `the page scrolls sideways: ${document.documentElement.scrollWidth} > ${window.innerWidth}`,
      );
    }
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body && focused.matches(":focus-visible")) {
      const s = getComputedStyle(focused);
      if (s.outlineStyle !== "solid" || s.outlineWidth !== "2px") {
        broken.push(`focused ${focused.tagName} has no focus ring (${s.outlineStyle} ${s.outlineWidth})`);
      }
    }
    for (const row of document.querySelectorAll<HTMLDetailsElement>("details.event-row[open]")) {
      const chapter = row.closest<HTMLElement>("[data-chapter]");
      const drawn = chapter !== null && chapter.getBoundingClientRect().height > 0;
      const more = row.querySelector(".row-more")?.getBoundingClientRect();
      if (drawn && more !== undefined && more.height === 0 && row.getBoundingClientRect().bottom > 0) {
        broken.push(`${row.dataset.event ?? "?"} is open but shows nothing`);
      }
    }
    return broken;
  }, expectedIds);
  return [...inPage, ...overflowing.map((o) => `cut off at the side: ${o}`)];
}

test.describe("fuzz", () => {
  for (const seed of seedsToRun()) {
    test(`seed ${seed}`, async ({ page }, info) => {
      test.skip(
        info.project.name !== "desktop",
        "The fuzzer resizes the page itself, so one project is enough.",
      );
      await openTimeline(page);
      const random = seeded(seed);
      const done: string[] = [];
      for (let i = 0; i < STEPS; i++) {
        const step = await nextStep(page, random);
        done.push(step.name);
        if (process.env.FUZZ_LOG) console.log(`FUZZLOG ${step.name}`);
        await step.run(page);
        const broken = await brokenRules(page);
        expect(broken, `Replay with FUZZ_SEED=${seed}. Steps:\n  ${done.join("\n  ")}`).toEqual([]);
      }
    });
  }
});
