// The fuzzer: a seeded reader who does only what a reader can do (scroll
// anywhere, jump to an event, open and close rows by pointer and keyboard,
// tab about, and turn a phone into a desktop and back) while the rules that
// must always hold are checked after every step. A failure prints its seed and
// the steps that led to it, so it can be replayed with FUZZ_SEED.
import { expect, test, type Page } from "@playwright/test";
import { READING_LINE } from "../src/engine/reading.ts";
import { seeded, type Random } from "../src/random.ts";
import { openTimeline, scrollToEvent, scrollToY, settle, state, timeline } from "./helpers.ts";

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
        const summary = row.querySelector("summary");
        const r = summary?.getBoundingClientRect();
        if (!summary || !r || r.height === 0 || r.top < 0 || r.bottom > window.innerHeight) return false;
        // Only a row a reader could click: nothing such as the open panel or the HUD lies over its middle.
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit !== null && summary.contains(hit);
      })
      .map((row) => row.dataset.event ?? ""),
  );
}

/** What a reader might do next. Each choice is drawn from the seeded source, so a seed is a whole replayable run. */
async function nextStep(page: Page, random: Random): Promise<Step> {
  const kind = random.pick([
    "scroll",
    "jump",
    "click-row",
    "tab",
    "key",
    "resize",
    "motion",
    "tick",
    "era-menu",
    "panel",
  ] as const);
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
      return {
        name: `click ${id}`,
        // A reader taps where they see the row, so this finds its middle now and taps there, rather than letting
        // Playwright scroll it about first.
        run: async (p) => {
          const point = await p.evaluate((rowId) => {
            const box = document.querySelector(`[data-event="${rowId}"] > summary`)?.getBoundingClientRect();
            return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
          }, id);
          if (point) await p.mouse.click(point.x, point.y);
        },
      };
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
    case "motion": {
      // A reader can change their system's motion setting while the page is open.
      const reducedMotion = random.pick(["reduce", "no-preference"] as const);
      return { name: `reduced motion ${reducedMotion}`, run: (p) => p.emulateMedia({ reducedMotion }) };
    }
    case "tick": {
      const boxes = await page
        .locator("#filter-panel input[type=checkbox]")
        .evaluateAll((els) =>
          els.map((el) => `${(el as HTMLInputElement).name}=${(el as HTMLInputElement).value}`),
        );
      const box = random.pick(boxes);
      const [name, value] = box.split("=");
      return {
        name: `tick ${box}`,
        run: async (p) => {
          if (!(await p.locator("#filter-panel").isVisible()))
            await p.locator("button.filter-toggle").click();
          await p.locator(`#filter-panel input[name="${name ?? ""}"][value="${value ?? ""}"]`).click();
        },
      };
    }
    case "era-menu": {
      const era = random.pick(timeline.events).era;
      return {
        name: `era menu to ${era}`,
        run: async (p) => {
          if (!(await p.locator("#filter-panel").isVisible()))
            await p.locator("button.filter-toggle").click();
          await p.locator(`.era-menu a[href="#era-${era}"]`).click();
        },
      };
    }
    case "panel": {
      return { name: "open or close the panel", run: (p) => p.locator("button.filter-toggle").click() };
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
  const { overflowing, hud } = await state(page);
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
  return [
    ...inPage,
    ...overflowing.map((o) => `cut off at the side: ${o}`),
    ...(await hudOutOfStep(page, hud?.year)),
    ...(await hudEraOutOfStep(page, hud?.theme ?? null)),
    ...(await motionUnderReduce(page)),
    ...(await filterOutOfStep(page)),
    ...(await focusBehindPanel(page)),
  ];
}

/** "430 BC", "AD 69" or "1900" back to a signed year. */
function yearOf(label: string): number {
  const bc = /^(\d+) BC$/.exec(label);
  if (bc) return -Number(bc[1]);
  return Number(label.replace(/^AD /, ""));
}

/**
 * The HUD's year must sit between the last event above the reading line and the first below it. This reads the
 * events on screen directly rather than asking the engine, so the engine cannot vouch for itself.
 */
async function hudOutOfStep(page: Page, label: string | undefined): Promise<string[]> {
  if (label === undefined) return ["the HUD is not showing"];
  const around = await page.evaluate((share) => {
    const line = window.innerHeight * share;
    let above: number | null = null;
    let below: number | null = null;
    for (const chapter of document.querySelectorAll<HTMLElement>("[data-chapter]")) {
      const box = chapter.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) continue;
      for (const event of chapter.querySelectorAll<HTMLElement>("[data-event]")) {
        const top = event.getBoundingClientRect().top;
        const year = Number(event.dataset.year);
        if (top <= line) above = year;
        else if (below === null) below = year;
      }
    }
    return { above, below };
  }, READING_LINE);
  const year = yearOf(label);
  const broken: string[] = [];
  if (around.above !== null && year < around.above)
    broken.push(`the HUD shows ${label}, before ${around.above} above the line`);
  if (around.below !== null && year > around.below)
    broken.push(`the HUD shows ${label}, after ${around.below} below the line`);
  return broken;
}

/**
 * What is dimmed must be exactly what does not match the ticked boxes, and the address must say what is ticked.
 * The rule is written out again here, in the page, rather than borrowed from the engine.
 */
async function filterOutOfStep(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const broken: string[] = [];
    const ticked: Record<string, string[]> = { reaction: [], region: [], theme: [] };
    for (const box of document.querySelectorAll<HTMLInputElement>("#filter-panel input:checked")) {
      ticked[box.name]?.push(box.value);
    }
    const any = Object.values(ticked).some((values) => values.length > 0);
    for (const event of document.querySelectorAll<HTMLElement>("[data-event]")) {
      const has = (name: string, values: string[]): boolean =>
        values.length === 0 || values.some((v) => (event.dataset[name] ?? "").split(" ").includes(v));
      const match =
        !any ||
        (has("reactions", ticked.reaction ?? []) &&
          has("regions", ticked.region ?? []) &&
          has("themes", ticked.theme ?? []));
      if (match === event.hasAttribute("data-dimmed")) {
        broken.push(
          `${event.dataset.event ?? "?"} is ${match ? "dimmed but matches" : "undimmed but does not match"}`,
        );
      }
    }
    const params = new URLSearchParams(window.location.search);
    for (const [name, values] of Object.entries(ticked)) {
      const inAddress = params.get(name)?.split(",") ?? [];
      if (inAddress.join() !== values.join())
        broken.push(`the address has ${name}=${inAddress.join()} but ${values.join()} is ticked`);
    }
    return broken.slice(0, 5);
  });
}

/** Under reduced motion nothing on the page animates. */
async function motionUnderReduce(page: Page): Promise<string[]> {
  const { reduce, animations } = await page.evaluate(() => ({
    reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animations: document.getAnimations().length,
  }));
  return reduce && animations > 0 ? [`${animations} animations run under reduced motion`] : [];
}

/**
 * While the panel is open, nothing in the page behind it has the keyboard focus: the panel closes as the focus moves
 * on, or on a phone the sheet would hide whatever took it.
 */
async function focusBehindPanel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#filter-panel");
    const focused = document.activeElement;
    if (!panel || panel.hidden || !(focused instanceof HTMLElement) || focused === document.body) return [];
    if (panel.contains(focused) || focused.classList.contains("filter-toggle")) return [];
    const what = focused.closest("[data-event]")?.getAttribute("data-event") ?? focused.tagName;
    return [`the panel is open while ${what}, behind it, has the focus`];
  });
}

/**
 * The HUD wears the era of the chapter under the middle of the screen; in a band, the earlier era until the band's
 * middle and the later one from it. Read from the page, not the engine.
 */
async function hudEraOutOfStep(page: Page, theme: string | null): Promise<string[]> {
  const expected = await page.evaluate(() => {
    const middle = window.innerHeight / 2;
    for (const block of document.querySelectorAll<HTMLElement>("[data-chapter], [data-band]")) {
      const box = block.getBoundingClientRect();
      if (middle < box.top || middle >= box.bottom) continue;
      if (block.dataset.chapter) return block.dataset.chapter;
      return middle >= box.top + box.height / 2 ? block.dataset.to : block.dataset.from;
    }
    return null;
  });
  return expected !== null && expected !== undefined && theme !== expected
    ? [`the HUD wears ${theme ?? "nothing"} while ${expected} is under the middle of the screen`]
    : [];
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
        await settle(page);
        const broken = await brokenRules(page);
        expect(broken, `Replay with FUZZ_SEED=${seed}. Steps:\n  ${done.join("\n  ")}`).toEqual([]);
      }
    });
  }
});
