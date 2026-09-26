// Holds tokens.css to tokens.json. Without it, a theme could lose a token and
// the page would fall back to whatever colour the previous era left behind.
import { describe, expect, it } from "vitest";
import { ERA_IDS } from "../src/eras.ts";
import { loadTokens, resolveColour, themedColourNames } from "../src/tokens/tokens.ts";
import { tokensToCss } from "../src/tokens/css.ts";

const tokens = loadTokens();
const css = tokensToCss(tokens);

/** The declarations inside the first block whose selector is exactly `selector`. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `no block for ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("tokens.json", () => {
  it("lists the eight eras in timeline order", () => {
    expect(tokens.eras).toEqual(ERA_IDS);
  });

  it("gives every themed colour a value in every era", () => {
    for (const name of themedColourNames(tokens)) {
      for (const era of ERA_IDS) {
        expect(tokens.colours[name]?.[era], `${name} in ${era}`).toBeTruthy();
      }
    }
  });
});

describe("tokens.css", () => {
  it("has a theme block for every era that defines every themed colour", () => {
    for (const era of ERA_IDS) {
      const theme = block(`[data-theme="${era}"]`);
      for (const name of themedColourNames(tokens)) {
        expect(theme).toContain(`--${name}: `);
      }
    }
  });

  it("keeps every era's raw values on :root, so a seam can mix any two eras", () => {
    const root = block(":root");
    for (const era of ERA_IDS) {
      expect(root).toContain(`--${era}-ground: ${resolveColour(tokens, "ground", era)};`);
    }
    expect(block('[data-theme="industrial"]')).toContain("--ground: var(--industrial-ground);");
  });

  it("resolves an alias to the token it names, in the same era", () => {
    expect(block('[data-theme="analog"]')).toContain("--focus: var(--ink);");
  });

  it("puts the chassis on :root: spacing, radius, fonts, durations, easing and era swatches", () => {
    const root = block(":root");
    for (const decl of [
      "--space-8: 32px;",
      "--radius-pill: 999px;",
      '--font-body: "Source Serif 4", Georgia, serif;',
      "--font-antiquity: Cinzel,",
      "--duration-card: 480ms;",
      "--ease-enter: cubic-bezier(0.2, 0, 0, 1);",
      "--era-medieval: #243f8f;",
      "--type-body-size: 18px;",
      "--type-label-track: 0.08em;",
      "--display-atomic-weight: 800;",
    ]) {
      expect(root).toContain(decl);
    }
  });

  it("names a theme before :root is overridden, so the first era is the default", () => {
    expect(css).toMatch(/:root,\s*\[data-theme="antiquity"\] \{/);
  });
});
