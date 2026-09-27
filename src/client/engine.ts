// The browser layer of the scroll engine. On each frame after a scroll it
// measures the chapters and seams, asks the engine where the reader is, and
// writes back only what changed: the blending seam's progress and text, and
// the HUD. All the deciding is in src/engine/, which is tested headless.
import { textOpacity, yearFaces, type Fade } from "../engine/blend.ts";
import {
  READING_LINE,
  hudYear,
  reading,
  formatYear,
  type Block,
  type EventIndex,
} from "../engine/reading.ts";
import { ERAS, type EraId } from "../eras.ts";
import { keepInView } from "./settle.ts";

interface SeamParts {
  element: HTMLElement;
  index: number;
  from: EraId;
  to: EraId;
  stage: HTMLElement | null;
  layers: { name: string; element: HTMLElement }[];
  fades: { caption: Fade; year: Fade };
  written: string;
}

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const blocks = [...document.querySelectorAll<HTMLElement>("[data-chapter], [data-seam]")];
const seams = new Map<HTMLElement, SeamParts>();
for (const element of document.querySelectorAll<HTMLElement>("[data-seam]")) {
  seams.set(element, {
    element,
    index: Number(element.dataset.seam),
    from: element.dataset.from as EraId,
    to: element.dataset.to as EraId,
    stage: element.querySelector<HTMLElement>(".seam-stage"),
    layers: [...element.querySelectorAll<HTMLElement>("[data-layer]")].map((layer) => ({
      name: layer.dataset.layer ?? "",
      element: layer,
    })),
    fades: JSON.parse(element.dataset.fades ?? "{}") as SeamParts["fades"],
    written: "",
  });
}

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
/** The fixed chrome that wears the skin of the era being read: the HUD, the filter button and the panel. */
const readingSkin = [...document.querySelectorAll<HTMLElement>('[data-skin="reading"]')];
const hudYearText = hud?.querySelector<HTMLElement>(".hud-year");
const hudNames = [...(hud?.querySelectorAll<HTMLElement>(".hud-era") ?? [])];
let hudWritten = "";

function writeSeam(parts: SeamParts, pc: number, pi: number, active: boolean): void {
  const opacities = parts.layers.map(({ name }) => {
    if (name === "caption") return textOpacity(pc, parts.fades.caption);
    const visible = textOpacity(pc, parts.fades.year);
    const faces = yearFaces(pc);
    return name === "year-from" ? faces.from * visible : faces.to * visible;
  });
  const key = `${pc.toFixed(4)}|${pi}|${active}|${opacities.map((o) => o.toFixed(3)).join(",")}`;
  if (key === parts.written) return;
  parts.written = key;
  parts.element.style.setProperty("--pc", pc.toFixed(4));
  parts.element.toggleAttribute("data-active", active);
  if (parts.stage) parts.stage.dataset.theme = pi === 1 ? parts.to : parts.from;
  parts.layers.forEach(({ element }, i) => {
    element.style.opacity = (opacities[i] ?? 0).toFixed(3);
  });
}

function update(): void {
  queued = false;
  const vh = window.innerHeight;
  const measured: Block[] = blocks.map((element) => {
    const { top, height } = element.getBoundingClientRect();
    const parts = seams.get(element);
    return parts
      ? { kind: "seam", index: parts.index, from: parts.from, to: parts.to, top, height }
      : { kind: "chapter", era: element.dataset.chapter as EraId, top, height };
  });
  const where = reading(measured, vh, reduced.matches);

  blocks.forEach((element, i) => {
    const parts = seams.get(element);
    const block = measured[i];
    if (!parts || !block) return;
    if (where.seam?.index === parts.index) writeSeam(parts, where.seam.blend.pc, where.seam.blend.pi, true);
    else {
      const passed = block.top + block.height <= vh / 2 ? 1 : 0;
      writeSeam(parts, passed, passed, false);
    }
  });

  const year = formatYear(hudYear(where, index, vh * READING_LINE));
  const pc = where.seam?.blend.pc ?? 1;
  const showing = where.seam
    ? { [ERAS[where.seam.index]?.id ?? ""]: 1 - pc, [ERAS[where.seam.index + 1]?.id ?? ""]: pc }
    : { [where.era]: 1 };
  const key = `${year}|${where.era}|${JSON.stringify(showing)}`;
  if (hud && key !== hudWritten) {
    hudWritten = key;
    for (const element of readingSkin) element.dataset.theme = where.era;
    if (hudYearText) hudYearText.textContent = year;
    for (const name of hudNames) {
      const opacity = showing[name.dataset.era ?? ""];
      name.hidden = opacity === undefined;
      name.style.opacity = (opacity ?? 0).toFixed(3);
    }
  }
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
// line without a scroll, so the engine also looks again whenever a chapter or seam changes size.
const resized = new ResizeObserver(queue);
for (const block of blocks) resized.observe(block);
reduced.addEventListener("change", queue);
update();
