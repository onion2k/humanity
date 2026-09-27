// The era art in the margins, and the emblem that stands in for it where
// there are no margins. It is decoration and carries no meaning, so it must be
// shapes only: its colour comes from the era's tokens, and nothing in it can
// be read, run or fetched. These hold every drawing to that.
import { describe, expect, it } from "vitest";
import { ART, ART_PARTS, artFile, artFileName, artStrength } from "../src/art.ts";
import { ERA_IDS } from "../src/eras.ts";

/** The SVG elements a drawing may use: shapes and groups, and nothing that writes, links, scripts or paints. */
const SHAPES = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);

function elementsOf(svg: string): string[] {
  return [...svg.matchAll(/<([a-zA-Z][\w-]*)/g)].map((m) => m[1] ?? "");
}

describe("the art", () => {
  it("gives every era a left piece, a right piece and an emblem", () => {
    expect(Object.keys(ART).sort()).toEqual([...ERA_IDS].sort());
    for (const era of ERA_IDS) {
      for (const part of ART_PARTS) expect(ART[era][part].svg.length, `${era} ${part}`).toBeGreaterThan(0);
    }
  });

  it("draws the margin pieces tall and the emblems square, so each fills the space it is given", () => {
    for (const era of ERA_IDS) {
      for (const side of ["left", "right"] as const) {
        const { width, height } = ART[era][side];
        expect(height / width, `${era} ${side}`).toBeCloseTo(3, 5);
      }
      expect(ART[era].emblem.width, era).toBe(ART[era].emblem.height);
    }
  });

  it("writes each drawing as a whole SVG file of shapes only", () => {
    for (const era of ERA_IDS) {
      for (const part of ART_PARTS) {
        const file = artFile(ART[era][part]);
        const where = `${era} ${part}`;
        expect(file, where).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+">/);
        expect(file.endsWith("</svg>"), where).toBe(true);
        for (const element of elementsOf(file))
          expect(SHAPES.has(element), `${where}: <${element}>`).toBe(true);
      }
    }
  });

  it("carries no colour of its own, so the era's tokens colour it through a mask", () => {
    for (const era of ERA_IDS) {
      for (const part of ART_PARTS) {
        const file = artFile(ART[era][part]);
        expect(file, `${era} ${part}`).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|oklab|url\(|href/i);
        const paints = [...file.matchAll(/(?:fill|stroke)=['"]([^'"]+)['"]/g)].map((m) => m[1]);
        for (const paint of paints) expect(["black", "none"], `${era} ${part}`).toContain(paint);
      }
    }
  });

  it("keeps every file small, so the art costs little to fetch", () => {
    for (const era of ERA_IDS) {
      for (const part of ART_PARTS) {
        expect(artFile(ART[era][part]).length, `${era} ${part}`).toBeLessThanOrEqual(4096);
      }
    }
  });

  it("keeps the margin art quiet, so it sits behind the reading and never competes with it", () => {
    for (const era of ERA_IDS) {
      expect(artStrength(era), era).toBeGreaterThan(0);
      expect(artStrength(era), era).toBeLessThanOrEqual(0.5);
    }
  });

  it("names each file for its era and part", () => {
    expect(artFileName("antiquity", "left")).toBe("antiquity-left");
    expect(artFileName("digital", "emblem")).toBe("digital-emblem");
  });
});
