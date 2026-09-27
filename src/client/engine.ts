// The browser layer of the HUD. On each frame after a scroll, a resize or a
// change in a chapter's size, it measures the chapters and the bands between
// them, asks the engine where the reader is, and writes back only what
// changed: the HUD's year, era and skin. All the deciding is in
// src/engine/reading.ts, which is tested headless.
import {
  READING_LINE,
  formatYear,
  hudYear,
  reading,
  type Block,
  type EventIndex,
} from "../engine/reading.ts";
import { ERAS, type EraId } from "../eras.ts";
import { keepInView } from "./settle.ts";

const root = document.documentElement;
const blocks = [...document.querySelectorAll<HTMLElement>("[data-chapter], [data-band]")];

const events = new Map<EraId, HTMLElement[]>(
  ERAS.map((era) => [
    era.id,
    [...document.querySelectorAll<HTMLElement>(`[data-chapter="${era.id}"] [data-event]`)],
  ]),
);
const years = new Map<EraId, number[]>(
  [...events].map(([era, list]) => [era, list.map((e) => Number(e.dataset.year))]),
);
const index: EventIndex = {
  years: (era) => years.get(era) ?? [],
  // The slot around an event is always laid out; the event inside it may be skipped until it is near the screen,
  // and reading its position would force the layout the skipping saves.
  topOf: (era, i) => (events.get(era)?.[i]?.parentElement ?? undefined)?.getBoundingClientRect().top ?? 0,
};

const hud = document.querySelector<HTMLElement>(".hud");
const hudYearText = hud?.querySelector<HTMLElement>(".hud-year");
const hudNames = [...(hud?.querySelectorAll<HTMLElement>(".hud-era") ?? [])];
/** The fixed chrome that wears the skin of the era being read: the HUD, the filter button and the panel. */
const readingSkin = [...document.querySelectorAll<HTMLElement>('[data-skin="reading"]')];
let written = "";

function update(): void {
  queued = false;
  const vh = window.innerHeight;
  const measured: Block[] = blocks.map((element) => {
    const { top, height } = element.getBoundingClientRect();
    return element.dataset.band === undefined
      ? { kind: "chapter", era: element.dataset.chapter as EraId, top, height }
      : {
          kind: "band",
          index: Number(element.dataset.band),
          from: element.dataset.from as EraId,
          to: element.dataset.to as EraId,
          top,
          height,
        };
  });
  const where = reading(measured, vh);
  const year = formatYear(hudYear(where, index, vh * READING_LINE));
  const key = `${year}|${where.era}`;
  if (!hud || key === written) return;
  written = key;
  for (const element of readingSkin) element.dataset.theme = where.era;
  if (hudYearText) hudYearText.textContent = year;
  // Only the era being read shows its name, so no other era's face is fetched before it is needed.
  for (const name of hudNames) name.hidden = name.dataset.era !== where.era;
}

let queued = false;
function queue(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

root.classList.add("engine-on");
window.addEventListener("scroll", queue, { passive: true });
window.addEventListener("resize", queue);
// A row reached by Tab is scrolled into view by the browser, which can land it under the chrome or off the screen
// once the events it passes are drawn. This puts it back where the reader can see it.
document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("main")) void keepInView(target);
});
// Opening a row, a face arriving late or a chapter drawn for the first time all move what is under the reading
// line without a scroll, so the engine also looks again whenever a chapter or band changes size.
const resized = new ResizeObserver(queue);
for (const block of blocks) resized.observe(block);
update();
