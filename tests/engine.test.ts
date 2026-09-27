// The HUD's maths, headless. The page is a run of chapters with a short band
// between each pair; the HUD shows the era and year of what the reader is
// reading. The browser only feeds these rectangles, so if they hold, the HUD
// is right wherever the reader is.
import { describe, expect, it } from "vitest";
import { ERAS } from "../src/eras.ts";
import {
  READING_LINE,
  formatYear,
  hudYear,
  lastAtOrAbove,
  reading,
  type Block,
  type EventIndex,
} from "../src/engine/reading.ts";
import { seeded } from "../src/random.ts";

describe("lastAtOrAbove", () => {
  it("finds the last item whose top is at or above the line", () => {
    const tops = [0, 100, 200, 300];
    expect(lastAtOrAbove(tops.length, (i) => tops[i] ?? 0, 150)).toBe(1);
    expect(lastAtOrAbove(tops.length, (i) => tops[i] ?? 0, 200)).toBe(2);
    expect(lastAtOrAbove(tops.length, (i) => tops[i] ?? 0, -1)).toBe(-1);
    expect(lastAtOrAbove(tops.length, (i) => tops[i] ?? 0, 1e9)).toBe(3);
    expect(lastAtOrAbove(0, () => 0, 100)).toBe(-1);
  });

  it("agrees with reading every item, on seeded random pages, while reading only a few", () => {
    const random = seeded(11);
    for (let run = 0; run < 500; run++) {
      const n = random.int(0, 400);
      const tops: number[] = [];
      let y = random.int(-2000, 2000);
      for (let i = 0; i < n; i++) tops.push((y += random.int(0, 400)));
      const line = random.int(-3000, 3000 + n * 200);
      let reads = 0;
      const found = lastAtOrAbove(
        n,
        (i) => {
          reads += 1;
          return tops[i] ?? 0;
        },
        line,
      );
      expect(found).toBe(tops.findLastIndex((t) => t <= line));
      expect(reads).toBeLessThanOrEqual(Math.ceil(Math.log2(n + 1)) + 1);
    }
  });
});

describe("formatYear", () => {
  it("writes BC for negative years, AD before 1000, and plain years after", () => {
    expect(formatYear(-430)).toBe("430 BC");
    expect(formatYear(69)).toBe("AD 69");
    expect(formatYear(500)).toBe("AD 500");
    expect(formatYear(1900)).toBe("1900");
  });
});

/** A page laid out from `top`: each chapter 2000px, and a 160px band between each pair, on an 800px screen. */
function page(top: number): Block[] {
  const blocks: Block[] = [];
  let y = top;
  ERAS.forEach((era, i) => {
    blocks.push({ kind: "chapter", era: era.id, top: y, height: 2000 });
    y += 2000;
    const next = ERAS[i + 1];
    if (next) {
      blocks.push({ kind: "band", index: i, from: era.id, to: next.id, top: y, height: 160 });
      y += 160;
    }
  });
  return blocks;
}

describe("reading", () => {
  it("names the chapter under the middle of the screen", () => {
    expect(reading(page(0), 800)).toEqual({ era: "antiquity", band: null });
    expect(reading(page(-(2000 + 160) - 100), 800)).toEqual({ era: "medieval", band: null });
  });

  it("keeps the earlier era until the middle of a band, and the later one from it", () => {
    // The middle of the screen is 400px down; the first band starts at 2000.
    expect(reading(page(400 - 2000 - 79), 800)).toEqual({
      era: "antiquity",
      band: { index: 0, past: false },
    });
    expect(reading(page(400 - 2000 - 80), 800)).toEqual({ era: "medieval", band: { index: 0, past: true } });
  });

  it("gives the first era above the whole timeline and the last below it", () => {
    expect(reading(page(5000), 800).era).toBe("antiquity");
    expect(reading(page(-1e6), 800).era).toBe("digital");
  });
});

describe("hudYear", () => {
  const years: Record<string, number[]> = { antiquity: [-430, -370], medieval: [], print: [1450, 1506] };
  const index = (tops: Record<string, number[]>): EventIndex => ({
    years: (era) => years[era] ?? [],
    topOf: (era, i) => tops[era]?.[i] ?? 0,
  });
  const line = 800 * READING_LINE;

  it("gives the year of the last event above the reading line", () => {
    expect(hudYear({ era: "antiquity", band: null }, index({ antiquity: [100, 500] }), line)).toBe(-430);
    expect(hudYear({ era: "antiquity", band: null }, index({ antiquity: [100, 300] }), line)).toBe(-370);
  });

  it("gives the first event's year above the first event, so it never shows a year before the timeline", () => {
    expect(hudYear({ era: "antiquity", band: null }, index({ antiquity: [900, 1200] }), line)).toBe(-430);
  });

  it("gives the era's first year at the top of a later chapter, so it never runs backwards after a band", () => {
    expect(hudYear({ era: "print", band: null }, index({ print: [900, 1200] }), line)).toBe(1450);
  });

  it("gives the earlier chapter's last year in a band before its middle, and the next era's first year after", () => {
    expect(hudYear({ era: "antiquity", band: { index: 0, past: false } }, index({}), line)).toBe(-370);
    expect(hudYear({ era: "medieval", band: { index: 0, past: true } }, index({}), line)).toBe(500);
  });

  it("gives an empty chapter's own first year before its band, as the chapter itself shows", () => {
    expect(hudYear({ era: "medieval", band: { index: 1, past: false } }, index({}), line)).toBe(500);
  });
});
