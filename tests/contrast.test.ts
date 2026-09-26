// The contrast gate. Every text pair the brand book promises must hold its
// ratio in every era theme, or the build fails. Without it, one tweak to an
// era's palette could quietly make a chapter unreadable.
import { describe, expect, it } from "vitest";
import { ERA_IDS, type EraId } from "../src/eras.ts";
import { loadTokens, resolveColour, type Tokens } from "../src/tokens/tokens.ts";
import { CONTRAST_PAIRS, assertContrast, checkContrast, contrastRatio } from "../src/tokens/contrast.ts";

const tokens = loadTokens();

/** A copy of the tokens with one colour changed in one era. */
function withColour(name: string, era: EraId, value: string): Tokens {
  const copy = structuredClone(tokens);
  copy.colours[name] = { ...copy.colours[name], [era]: value };
  return copy;
}

describe("contrastRatio", () => {
  it("matches the WCAG figures for known pairs", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#777777")).toBeCloseTo(4.48, 2);
  });

  it("reads three-digit hex", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("refuses a colour it cannot read, rather than guessing", () => {
    expect(() => contrastRatio("tomato", "#fff")).toThrow();
  });
});

describe("the pairs the gate checks", () => {
  it("name only tokens that exist, so a renamed token cannot drop out of the gate", () => {
    for (const pair of CONTRAST_PAIRS) {
      expect(tokens.colours[pair.fg], pair.fg).toBeDefined();
      expect(tokens.colours[pair.bg], pair.bg).toBeDefined();
    }
  });

  it("cover every text pair the brand book promises", () => {
    const keys = CONTRAST_PAIRS.map((p) => `${p.fg}/${p.bg}@${p.min}`);
    for (const k of [
      "ink/ground@4.5",
      "ink/ground-raised@4.5",
      "ink/accent-soft@4.5",
      "ink-muted/ground@4.5",
      "ink-muted/ground-raised@4.5",
      "accent/ground@4.5",
      "accent/ground-raised@4.5",
      "on-accent/accent@4.5",
      "focus/ground@3",
      "focus/ground-raised@3",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("hold every reaction mark to 3:1 on both grounds, because a mark nobody can see loses its shape", () => {
    const keys = CONTRAST_PAIRS.map((p) => `${p.fg}/${p.bg}@${p.min}`);
    const reactions = Object.keys(tokens.colours).filter((name) => name.startsWith("react-"));
    expect(reactions.length).toBeGreaterThanOrEqual(4);
    for (const fg of reactions) {
      expect(keys).toContain(`${fg}/ground@3`);
      expect(keys).toContain(`${fg}/ground-raised@3`);
    }
  });
});

describe("the gate", () => {
  it("catches a pair that falls below its ratio", () => {
    const broken = withColour("ink-muted", "print", resolveColour(tokens, "ground", "print"));
    const failures = checkContrast(broken);
    expect(failures).toContainEqual(expect.objectContaining({ era: "print", fg: "ink-muted", bg: "ground" }));
  });

  it("follows an alias to the colour it names", () => {
    const broken = withColour("ink", "digital", resolveColour(tokens, "ground", "digital"));
    const failures = checkContrast(broken);
    expect(failures).toContainEqual(expect.objectContaining({ era: "digital", fg: "focus", bg: "ground" }));
  });

  describe.each(ERA_IDS)("in %s", (era) => {
    it.each(CONTRAST_PAIRS.map((p) => [`${p.fg} on ${p.bg}`, p] as const))(
      "%s holds its ratio",
      (_, pair) => {
        const failure = checkContrast(tokens).find(
          (f) => f.era === era && f.fg === pair.fg && f.bg === pair.bg,
        );
        expect(failure, failure && `${failure.ratio.toFixed(2)}:1 < ${pair.min}:1`).toBeUndefined();
      },
    );
  });
});

describe("assertContrast, which the build runs", () => {
  it("passes the real tokens", () => {
    expect(() => {
      assertContrast(tokens);
    }).not.toThrow();
  });

  it("stops with every failing pair named", () => {
    const broken = withColour("accent", "machine", resolveColour(tokens, "ground", "machine"));
    expect(() => {
      assertContrast(broken);
    }).toThrow(/machine: accent on ground is 1\.00:1, needs 4\.5:1/);
  });
});
