// Where the reader is: which chapter, or which band between two chapters, is
// under the middle of the screen, and which year the HUD should show. It takes
// rectangles and a way to look up event positions, and reads as few of them as
// it can, because it runs on every frame of a scroll through 386 events.
import { ERAS, type EraId } from "../eras.ts";

/** The HUD shows the last event above this share of the viewport's height. */
export const READING_LINE = 0.55;

export type Block =
  | { kind: "chapter"; era: EraId; top: number; height: number }
  | { kind: "band"; index: number; from: EraId; to: EraId; top: number; height: number };

export interface Reading {
  /** The era the reader is in: in a band, the earlier era until its middle and the later one from it. */
  era: EraId;
  band: { index: number; past: boolean } | null;
}

export interface EventIndex {
  /** The start years of an era's events, in page order. */
  years(era: EraId): readonly number[];
  /** Where an era's event starts, relative to the top of the viewport. */
  topOf(era: EraId, i: number): number;
}

/** The index of the last item whose top is at or above the line, or -1. Items are in page order. */
export function lastAtOrAbove(count: number, topOf: (i: number) => number, line: number): number {
  let low = 0;
  let high = count - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (topOf(middle) <= line) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

export function formatYear(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}

export function reading(blocks: readonly Block[], viewportHeight: number): Reading {
  const middle = viewportHeight / 2;
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  if (first && middle < first.top) return { era: ERAS[0]?.id ?? "antiquity", band: null };
  for (const block of blocks) {
    if (middle < block.top || middle >= block.top + block.height) continue;
    if (block.kind === "chapter") return { era: block.era, band: null };
    const past = middle >= block.top + block.height / 2;
    return { era: past ? block.to : block.from, band: { index: block.index, past } };
  }
  const lastEra = last?.kind === "chapter" ? last.era : last?.to;
  return { era: lastEra ?? ERAS[ERAS.length - 1]?.id ?? "digital", band: null };
}

function eraStart(era: EraId): number {
  return ERAS.find((e) => e.id === era)?.from ?? 0;
}

/** The year the HUD shows. It never runs backwards as the reader scrolls on, and never shows a year before the timeline. */
export function hudYear(where: Reading, index: EventIndex, line: number): number {
  const first = ERAS[0]?.id;
  const firstYear = (): number => (first === undefined ? 0 : (index.years(first)[0] ?? eraStart(first)));
  if (where.band) {
    const from = ERAS[where.band.index]?.id;
    const to = ERAS[where.band.index + 1]?.id;
    if (where.band.past) return to === undefined ? firstYear() : eraStart(to);
    if (from === undefined) return firstYear();
    const years = index.years(from);
    return years[years.length - 1] ?? (from === first ? firstYear() : eraStart(from));
  }
  const years = index.years(where.era);
  const i = lastAtOrAbove(years.length, (j) => index.topOf(where.era, j), line);
  if (i >= 0) return years[i] ?? eraStart(where.era);
  return where.era === first ? firstYear() : eraStart(where.era);
}
