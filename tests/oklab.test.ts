// Colours in oklab, the space each era band blends in. The band's own blend
// is the browser's, but a test reads the colour at the band's middle and
// compares it with this, so this has to mix as CSS does.
import { describe, expect, it } from "vitest";
import { hexToOklab, mixOklab, oklabToHex } from "../src/tokens/oklab.ts";

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
