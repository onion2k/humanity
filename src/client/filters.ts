// The filter panel's browser layer: it reads the ticked boxes, dims the events
// that do not match, says how many do, and keeps the filter in the address
// without adding to the history. What matches is decided in
// src/engine/filter.ts, which is tested headless.
import {
  countLabel,
  filterFromQuery,
  filterToQuery,
  isEmpty,
  matches,
  type Facets,
  type Filter,
} from "../engine/filter.ts";
import { landOn } from "./settle.ts";

const panel = document.querySelector<HTMLElement>("#filter-panel");
const toggle = document.querySelector<HTMLButtonElement>("button.filter-toggle");

if (panel && toggle) {
  const boxes = [...panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  const count = panel.querySelector<HTMLElement>(".filter-count");
  const badge = toggle.querySelector<HTMLElement>(".filter-badge");
  const values = (name: string): string[] => boxes.filter((b) => b.name === name).map((b) => b.value);
  const known = { reactions: values("reaction"), regions: values("region"), themes: values("theme") };
  const split = (value: string | undefined): string[] => (value ? value.split(" ") : []);
  const events = [...document.querySelectorAll<HTMLElement>("[data-event]")].map((element) => ({
    element,
    facets: {
      reactions: split(element.dataset.reactions),
      regions: split(element.dataset.regions),
      themes: split(element.dataset.themes),
    } satisfies Facets,
  }));

  const ticked = (): Filter => {
    const on = (name: string): string[] =>
      boxes.filter((b) => b.name === name && b.checked).map((b) => b.value);
    return { reactions: on("reaction"), regions: on("region"), themes: on("theme") };
  };

  const apply = (): void => {
    const filter = ticked();
    const empty = isEmpty(filter);
    let matching = 0;
    for (const { element, facets } of events) {
      const match = empty || matches(facets, filter);
      if (match) matching += 1;
      element.toggleAttribute("data-dimmed", !match);
    }
    if (count) count.textContent = countLabel(matching, events.length, empty);
    if (badge) {
      badge.hidden = empty;
      badge.textContent = empty ? "" : String(matching);
    }
    const address = `${window.location.pathname}${filterToQuery(filter)}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", address);
  };

  const open = (show: boolean): void => {
    panel.hidden = !show;
    toggle.setAttribute("aria-expanded", String(show));
  };

  const fromAddress = filterFromQuery(window.location.search, known);
  for (const box of boxes) {
    const group =
      box.name === "reaction"
        ? fromAddress.reactions
        : box.name === "region"
          ? fromAddress.regions
          : fromAddress.themes;
    box.checked = group.includes(box.value);
  }
  apply();

  panel.addEventListener("change", apply);
  panel.querySelector(".filter-clear")?.addEventListener("click", () => {
    for (const box of boxes) box.checked = false;
    apply();
  });
  toggle.addEventListener("click", () => {
    open(panel.hidden !== false);
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    open(false);
    toggle.focus();
  });
  // A jump to an era closes the panel, which on a phone would otherwise cover the chapter.
  for (const link of panel.querySelectorAll<HTMLAnchorElement>(".era-menu a")) {
    link.addEventListener("click", () => {
      open(false);
      const heading = document.getElementById(link.hash.slice(1));
      if (heading) void landOn(heading);
    });
  }
  // So does the focus moving on into the page, by Tab past the last era or a press on a row: the panel would lie
  // over whatever took it, and on a phone hide it whole. Its own button keeps it open.
  document.addEventListener("focusin", ({ target }) => {
    if (panel.hidden || target === toggle || (target instanceof Node && panel.contains(target))) return;
    open(false);
  });
}
