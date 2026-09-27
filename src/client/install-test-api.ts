// Installs window.__pw in test builds. The page itself never loads this, so
// the shipped site has no script at all until the scroll engine arrives.
import { ERA_IDS, type EraId } from "../eras.ts";
import type { PageState, TestApi } from "./test-api.ts";

/** Resolves after the browser has drawn n frames, so a scroll has been laid out before anything reads it. */
function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number): void => {
      if (left === 0) resolve();
      else
        requestAnimationFrame(() => {
          step(left - 1);
        });
    };
    step(n);
  });
}

/**
 * Scrolls to wherever `target` says, again and again, until the page has stopped moving under it. Chapters off
 * screen are sized by an estimate until they are drawn, and a display face that arrives late changes the height of
 * the text set in it, so one scroll can land well off. It returns only after two rounds in a row, each waiting for
 * the frame and for any fonts in flight, find the scroll already where the target says.
 */
/** The browser may round a scroll to a whole pixel, so a scroll within one pixel of its target has landed. */
const SCROLL_GRAIN = 1;

async function settleScroll(target: () => number): Promise<void> {
  // A target past either end of the page means that end.
  const reachable = (): number =>
    Math.max(0, Math.min(target(), document.documentElement.scrollHeight - window.innerHeight));
  let settledRounds = 0;
  const rounds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const want = reachable();
    rounds.push(`wanted ${want.toFixed(2)} at ${window.scrollY.toFixed(2)}`);
    if (Math.abs(window.scrollY - want) >= SCROLL_GRAIN) {
      window.scrollTo({ top: want, behavior: "instant" });
      settledRounds = 0;
    }
    await frames(2);
    await document.fonts.ready;
    settledRounds = Math.abs(window.scrollY - reachable()) < SCROLL_GRAIN ? settledRounds + 1 : 0;
    if (settledRounds === 2) return;
  }
  throw new Error(
    `The page never stopped moving under the scroll. Last rounds: ${rounds.slice(-4).join("; ")}`,
  );
}

function required(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Nothing on the page matches ${selector}`);
  return el;
}

const pageTop = (el: HTMLElement): number => el.getBoundingClientRect().top + window.scrollY;

function eraAtTop(): EraId | null {
  const hit = document.elementFromPoint(window.innerWidth / 2, 1);
  const theme = hit?.closest("[data-theme]")?.getAttribute("data-theme") ?? null;
  return theme !== null && (ERA_IDS as readonly string[]).includes(theme) ? (theme as EraId) : null;
}

/** The blocks a reader has to be able to read whole: headings, cards, row lines and opened rows. */
const READABLE =
  ".intro, .chapter-head, .event-card, .event-row > summary, .event-row[open] > .row-more, .colophon";

function overflowing(): string[] {
  return [...document.querySelectorAll<HTMLElement>(READABLE)].flatMap((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return [];
    if (r.left >= -0.5 && r.right <= document.documentElement.clientWidth + 0.5) return [];
    const where = el.closest("[data-event]")?.getAttribute("data-event") ?? el.className;
    return [
      `${where} (${el.className || el.tagName.toLowerCase()}) spans ${Math.round(r.left)}–${Math.round(r.right)}`,
    ];
  });
}

function hudState(): PageState["hud"] {
  const hud = document.querySelector<HTMLElement>(".hud");
  if (!hud || getComputedStyle(hud).display === "none") return null;
  const names = [...hud.querySelectorAll<HTMLElement>(".hud-era:not([hidden])")];
  const strongest = names.sort((a, b) => Number(b.style.opacity || 1) - Number(a.style.opacity || 1))[0];
  const theme = hud.dataset.theme ?? null;
  return {
    year: hud.querySelector(".hud-year")?.textContent ?? "",
    era: strongest?.textContent ?? "",
    theme: theme !== null && (ERA_IDS as readonly string[]).includes(theme) ? (theme as EraId) : null,
  };
}

function filterBoxes(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('#filter-panel input[type="checkbox"]')];
}

function tickedFilter(): PageState["filter"] {
  const on = (name: string): string[] =>
    filterBoxes()
      .filter((b) => b.name === name && b.checked)
      .map((b) => b.value);
  return { reactions: on("reaction"), regions: on("region"), themes: on("theme") };
}

const api: TestApi = {
  async scrollToEvent(id, offset = 0) {
    const el = required(`[data-event="${CSS.escape(id)}"]`);
    await settleScroll(() => pageTop(el) - offset);
  },
  async scrollToEra(id) {
    const el = required(`[data-chapter="${CSS.escape(id)}"]`);
    await settleScroll(() => pageTop(el));
  },
  async scrollToBand(index, progress) {
    const el = required(`[data-band="${index}"]`);
    await settleScroll(() => pageTop(el) + progress * el.offsetHeight - window.innerHeight / 2);
  },
  async scrollToY(y) {
    await settleScroll(() => y);
  },
  async setFilter(filter) {
    const wanted: Record<string, readonly string[]> = {
      reaction: filter.reactions,
      region: filter.regions,
      theme: filter.themes,
    };
    for (const box of filterBoxes()) box.checked = wanted[box.name]?.includes(box.value) ?? false;
    document.querySelector("#filter-panel")?.dispatchEvent(new Event("change", { bubbles: true }));
    await frames(2);
  },
  async settle() {
    let still = 0;
    let last = window.scrollY;
    for (let i = 0; i < 300 && still < 3; i++) {
      await frames(1);
      still = Math.abs(window.scrollY - last) < SCROLL_GRAIN ? still + 1 : 0;
      last = window.scrollY;
    }
    await document.fonts.ready;
    await frames(2);
  },
  state(): PageState {
    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      eraAtTop: eraAtTop(),
      openRows: [...document.querySelectorAll("details.event-row[open]")].map(
        (el) => el.getAttribute("data-event") ?? "",
      ),
      eventCount: document.querySelectorAll("[data-event]").length,
      overflowing: overflowing(),
      hud: hudState(),
      filter: tickedFilter(),
      dimmed: [...document.querySelectorAll("[data-event][data-dimmed]")].map(
        (el) => el.getAttribute("data-event") ?? "",
      ),
      count: document.querySelector(".filter-count")?.textContent ?? "",
      panelOpen: document.querySelector<HTMLElement>("#filter-panel")?.hidden === false,
    };
  },
};

window.__pw = api;
