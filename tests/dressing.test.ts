// The era textures behind each chapter's events. They are decoration, so they
// must never cost the text laid over them its ratio. These hold every era to
// that, and prove the check catches a texture strong enough to break it.
import { describe, expect, it } from "vitest";
import { TEXTURES, textureTile } from "../src/dressing.ts";
import { ERA_IDS } from "../src/eras.ts";
import { dressingContrastFailures, overlay } from "../src/tokens/dressing.ts";
import { loadTokens } from "../src/tokens/tokens.ts";

const tokens = loadTokens();

describe("the dressing", () => {
  it("gives every era a texture", () => {
    expect(Object.keys(TEXTURES).sort()).toEqual([...ERA_IDS].sort());
  });

  it("draws textures as shapes only, so their colour always comes from the era's rule token", () => {
    for (const era of ERA_IDS) {
      const tile = textureTile(era);
      expect(tile, era).toMatch(/^url\("data:image\/svg\+xml,/);
      expect(decodeURIComponent(tile), era).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|oklab/i);
    }
  });

  it("keeps every texture faint", () => {
    for (const era of ERA_IDS) expect(TEXTURES[era].strength, era).toBeLessThanOrEqual(0.6);
  });
});

describe("overlay", () => {
  it("composites a colour over a ground at a strength, as the browser paints it", () => {
    expect(overlay("#ffffff", "#000000", 0)).toBe("#ffffff");
    expect(overlay("#ffffff", "#000000", 1)).toBe("#000000");
    expect(overlay("#ffffff", "#000000", 0.5)).toBe("#808080");
  });
});

describe("the dressing contrast gate", () => {
  it("passes the real textures: text over a texture line holds its ratio", () => {
    expect(dressingContrastFailures(tokens)).toEqual([]);
  });

  it("catches a texture strong enough to take the dates below 4.5:1", () => {
    const strong = { ...TEXTURES, atomic: { ...TEXTURES.atomic, strength: 1 } };
    const failures = dressingContrastFailures(tokens, strong);
    expect(failures).toContainEqual(
      expect.objectContaining({ era: "atomic", where: "texture", text: "ink-muted" }),
    );
  });

  it("does not hold the chapter heading's accent to the texture, because the texture stays out from under the heading", () => {
    const text = dressingContrastFailures(tokens, TEXTURES, ["accent"]).map((f) => `${f.era} ${f.where}`);
    expect(text).toContain("machine texture");
    expect(dressingContrastFailures(tokens).some((f) => f.text === "accent")).toBe(false);
  });
});
