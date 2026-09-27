// The scroll engine's maths, headless. The page only feeds it rectangles and
// writes back what it says, so if these hold, the blend, the text fades and
// the year in the HUD are right wherever the reader is.
import { describe, expect, it } from "vitest";
import { ERAS } from "../src/eras.ts";
import {
  BLEND_SPAN,
  BLEND_START,
  FADE_BAND,
  blendAt,
  seamRaw,
  smoothstep,
  YEAR_CROSSFADE,
  textOpacity,
  yearFaces,
} from "../src/engine/blend.ts";
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

describe("blendAt", () => {
  it("holds the earlier era until the blend starts, and the later one after it ends", () => {
    expect(blendAt(0).pc).toBe(0);
    expect(blendAt(BLEND_START).pc).toBe(0);
    expect(blendAt(BLEND_START + BLEND_SPAN).pc).toBe(1);
    expect(blendAt(1).pc).toBe(1);
  });

  it("eases through the middle, reaching half way exactly at the midpoint", () => {
    expect(blendAt(0.5).pc).toBeCloseTo(0.5, 10);
    expect(blendAt(0.35).pc).toBeCloseTo(smoothstep(0.125), 10);
    expect(blendAt(0.35).pc).toBeLessThan(0.125);
  });

  it("never runs backwards as the reader scrolls on", () => {
    let last = -1;
    for (let k = 0; k <= 1000; k++) {
      const { pc } = blendAt(k / 1000);
      expect(pc).toBeGreaterThanOrEqual(last);
      last = pc;
    }
  });

  it("switches text colours at the midpoint and not before", () => {
    expect(blendAt(0.4999).pi).toBe(0);
    expect(blendAt(0.5).pi).toBe(1);
  });

  it("snaps the whole change to the midpoint under reduced motion", () => {
    expect(blendAt(0.49, true)).toEqual({ raw: 0.49, pc: 0, pi: 0 });
    expect(blendAt(0.5, true)).toEqual({ raw: 0.5, pc: 1, pi: 1 });
  });
});

describe("seamRaw", () => {
  it("measures how far the middle of the viewport is through the seam", () => {
    expect(seamRaw(400, 1360, 800)).toBe(0);
    expect(seamRaw(400 - 680, 1360, 800)).toBe(0.5);
    expect(seamRaw(400 - 1360, 1360, 800)).toBe(1);
  });

  it("stays between 0 and 1 outside the seam", () => {
    expect(seamRaw(5000, 1360, 800)).toBe(0);
    expect(seamRaw(-5000, 1360, 800)).toBe(1);
  });
});

describe("textOpacity", () => {
  it("shows text that never fades at full strength throughout", () => {
    for (const pc of [0, 0.3, 0.5, 0.7, 1]) expect(textOpacity(pc, { until: null, from: null })).toBe(1);
  });

  it("has faded the earlier era's text out completely by its limit", () => {
    const fade = { until: 0.2, from: 0.8 };
    expect(textOpacity(0.2 - FADE_BAND, fade)).toBeCloseTo(1, 10);
    expect(textOpacity(0.2 - FADE_BAND / 2, fade)).toBeCloseTo(0.5, 10);
    expect(textOpacity(0.2, fade)).toBe(0);
    expect(textOpacity(0.5, fade)).toBe(0);
  });

  it("brings the later era's text back only from its limit", () => {
    const fade = { until: 0.2, from: 0.8 };
    expect(textOpacity(0.8, fade)).toBe(0);
    expect(textOpacity(0.8 + FADE_BAND, fade)).toBeCloseTo(1, 10);
    expect(textOpacity(1, fade)).toBe(1);
  });
});

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

/** A page of blocks laid out from `top`, each chapter 2000px and each seam 1360px, as on an 800px screen. */
function page(top: number): Block[] {
  const blocks: Block[] = [];
  let y = top;
  ERAS.forEach((era, i) => {
    blocks.push({ kind: "chapter", era: era.id, top: y, height: 2000 });
    y += 2000;
    const next = ERAS[i + 1];
    if (next) {
      blocks.push({ kind: "seam", index: i, from: era.id, to: next.id, top: y, height: 1360 });
      y += 1360;
    }
  });
  return blocks;
}

describe("reading", () => {
  it("names the chapter under the middle of the screen, with no seam", () => {
    expect(reading(page(0), 800)).toEqual({ era: "antiquity", seam: null });
    expect(reading(page(-(2000 + 1360) - 100), 800)).toEqual({ era: "medieval", seam: null });
  });

  it("names the seam and its blend when the middle of the screen is in one", () => {
    const r = reading(page(-2000 - 680 + 400), 800);
    expect(r.seam?.index).toBe(0);
    expect(r.seam?.blend.raw).toBeCloseTo(0.5, 10);
    expect(r.era).toBe("medieval");
  });

  it("keeps the earlier era until the seam's midpoint", () => {
    const r = reading(page(-2000 - 600 + 400), 800);
    expect(r.seam?.blend.pi).toBe(0);
    expect(r.era).toBe("antiquity");
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
    expect(hudYear({ era: "antiquity", seam: null }, index({ antiquity: [100, 500] }), line)).toBe(-430);
    expect(hudYear({ era: "antiquity", seam: null }, index({ antiquity: [100, 300] }), line)).toBe(-370);
  });

  it("gives the first event's year above the first event, so it never shows a year before the timeline", () => {
    expect(hudYear({ era: "antiquity", seam: null }, index({ antiquity: [900, 1200] }), line)).toBe(-430);
  });

  it("gives the era's first year at the top of a later chapter, so it never runs backwards after a seam", () => {
    expect(hudYear({ era: "print", seam: null }, index({ print: [900, 1200] }), line)).toBe(1450);
  });

  it("gives the earlier chapter's last year in a seam before its midpoint, and the next era's first year after", () => {
    const before = { era: "antiquity" as const, seam: { index: 0, blend: blendAt(0.4) } };
    const after = { era: "medieval" as const, seam: { index: 0, blend: blendAt(0.6) } };
    expect(hudYear(before, index({}), line)).toBe(-370);
    expect(hudYear(after, index({}), line)).toBe(500);
  });

  it("gives an empty chapter's own first year before its seam, as the chapter itself shows", () => {
    const beforePrint = { era: "medieval" as const, seam: { index: 1, blend: blendAt(0.4) } };
    expect(hudYear(beforePrint, index({}), line)).toBe(500);
  });
});

describe("yearFaces", () => {
  it("shows only the earlier era's face until the crossfade, and only the later one's after it", () => {
    expect(yearFaces(0)).toEqual({ from: 1, to: 0 });
    // At the window's edges the arithmetic is only close to whole, which the page rounds away.
    expect(yearFaces(0.5 - YEAR_CROSSFADE / 2).to).toBeCloseTo(0, 10);
    expect(yearFaces(0.5 + YEAR_CROSSFADE / 2).from).toBeCloseTo(0, 10);
    expect(yearFaces(1)).toEqual({ from: 0, to: 1 });
  });

  it("crossfades over a short window at the midpoint, so the two faces overlap only briefly", () => {
    expect(YEAR_CROSSFADE).toBeLessThanOrEqual(0.25);
    expect(yearFaces(0.5).from).toBeCloseTo(0.5, 10);
    expect(yearFaces(0.5).to).toBeCloseTo(0.5, 10);
  });

  it("always adds up to one face's worth, and never runs backwards", () => {
    let last = -1;
    for (let k = 0; k <= 1000; k++) {
      const { from, to } = yearFaces(k / 1000);
      expect(from + to).toBeCloseTo(1, 10);
      expect(to).toBeGreaterThanOrEqual(last);
      last = to;
    }
  });
});
