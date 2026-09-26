// The seam text gate. Text in a seam sits on a ground that is blending from
// one era to the next, so it fades out before the ground takes it below its
// ratio. This holds every seam to that at a thousand points through it, and
// proves the gate catches a palette that would break it.
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../src/tokens/contrast.ts";
import { hexToOklab, mixOklab, oklabToHex } from "../src/tokens/oklab.ts";
import { assertSeamText, seamFades, seamTextFailures } from "../src/tokens/seams.ts";
import { loadTokens, resolveColour, type Tokens } from "../src/tokens/tokens.ts";
import type { EraId } from "../src/eras.ts";

const tokens = loadTokens();

function withColour(name: string, era: EraId, value: string): Tokens {
  const copy = structuredClone(tokens);
  copy.colours[name] = { ...copy.colours[name], [era]: value };
  return copy;
}

describe("oklab", () => {
  it("goes there and back without moving a colour", () => {
    for (const hex of ["#000000", "#ffffff", "#1f2420", "#f2ece0", "#2b3bff", "#a13e1b"]) {
      expect(oklabToHex(hexToOklab(hex))).toBe(hex);
    }
  });

  it("mixes as CSS color-mix(in oklab) does, ends included", () => {
    expect(mixOklab("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixOklab("#000000", "#ffffff", 1)).toBe("#ffffff");
    // Half way from black to white in oklab is L = 0.5, which is #636363.
    expect(mixOklab("#000000", "#ffffff", 0.5)).toBe("#636363");
  });
});

describe("seamFades", () => {
  it("lets text on a seam between two light eras stay until the caption's usual fade", () => {
    const fades = seamFades(tokens, "antiquity", "medieval");
    expect(fades.year).toEqual({ until: null, from: null });
    expect(fades.caption.until).toBe(0.4);
    expect(fades.caption.from).toBe(0.6);
  });

  it("fades text early on a light–dark crossing", () => {
    for (const [from, to] of [
      ["print", "industrial"],
      ["industrial", "machine"],
      ["atomic", "analog"],
      ["analog", "digital"],
    ] as const) {
      const fades = seamFades(tokens, from, to);
      expect(fades.caption.until, `${from}→${to}`).toBeLessThan(0.3);
      expect(fades.caption.from, `${from}→${to}`).toBeGreaterThan(0.7);
      expect(fades.year.until, `${from}→${to}`).not.toBeNull();
    }
  });
});

describe("the seam text gate", () => {
  it("passes the real tokens in every seam", () => {
    expect(seamTextFailures(tokens)).toEqual([]);
    expect(() => {
      assertSeamText(tokens);
    }).not.toThrow();
  });

  it("finds that the prototype's fixed fade would fail the dark crossings", () => {
    const fixed = { caption: { until: 0.4, from: 0.6 }, year: { until: null, from: null } };
    const failures = seamTextFailures(tokens, () => fixed);
    const seams = new Set(failures.map((f) => `${f.from}→${f.to}`));
    expect([...seams].sort()).toEqual(
      ["analog→digital", "atomic→analog", "industrial→machine", "print→industrial"].sort(),
    );
  });

  it("checks what is on screen: every failure it reports is a visible layer below its ratio", () => {
    const fixed = { caption: { until: 0.4, from: 0.6 }, year: { until: null, from: null } };
    for (const f of seamTextFailures(tokens, () => fixed)) {
      expect(f.ratio).toBeLessThan(f.min);
      expect(contrastRatio(f.colour, f.ground)).toBeCloseTo(f.ratio, 5);
    }
  });

  it("recomputes its fades from the palette, so a change to a ground moves them rather than breaking them", () => {
    const darker = withColour("ground", "machine", "#c9c0ae");
    expect(seamTextFailures(darker)).toEqual([]);
    expect(seamFades(darker, "industrial", "machine")).not.toEqual(
      seamFades(tokens, "industrial", "machine"),
    );
  });

  it("uses the right ink on each side of the midpoint", () => {
    const ink = resolveColour(tokens, "ink-muted", "industrial");
    const failures = seamTextFailures(tokens, () => ({
      caption: { until: 0.45, from: 0.55 },
      year: { until: 0, from: 1 },
    }));
    const early = failures.find((f) => f.from === "industrial" && f.pc < 0.5);
    expect(early?.colour).toBe(ink);
  });
});
