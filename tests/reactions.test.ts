// Every reaction the site can show needs a word, a shape and a fill that the
// contrast gate holds. Without these checks a reaction could reach the page as
// a word with no mark, or as a mark nobody can see in one era.
import { describe, expect, it } from "vitest";
import { loadTimeline } from "../src/data/load.ts";
import { REACTION_IDS, REACTIONS, VERDICT_LABELS } from "../src/reactions.ts";
import { CONTRAST_PAIRS } from "../src/tokens/contrast.ts";
import { loadTokens } from "../src/tokens/tokens.ts";

const tokens = loadTokens();
const { vocabularies } = loadTimeline();

describe("REACTIONS", () => {
  it("gives every reaction id a word, a shape and a fill", () => {
    expect(Object.keys(REACTIONS).sort()).toEqual([...REACTION_IDS].sort());
  });

  it("uses the export's own word for each reaction", () => {
    for (const { id, label } of vocabularies.reactions) {
      expect(REACTIONS[id as keyof typeof REACTIONS].label, id).toBe(label);
    }
  });

  it("gives each reaction its own silhouette, because the shape is the meaning", () => {
    const paths = Object.values(REACTIONS).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^M[\d\s.,MmLlHhVvCcSsQqTtAaZz-]+$/);
  });

  it("fills each mark from a react-* token that exists in every era", () => {
    for (const [id, r] of Object.entries(REACTIONS)) {
      expect(r.token, id).toMatch(/^react-/);
      const values = tokens.colours[r.token];
      expect(values, `${id}: ${r.token}`).toBeDefined();
      expect(Object.keys(values ?? {}).sort(), r.token).toEqual([...tokens.eras].sort());
    }
  });

  it("gives each reaction a different fill, so colour still reinforces the shape", () => {
    const fills = Object.values(REACTIONS).map((r) => r.token);
    expect(new Set(fills).size).toBe(fills.length);
  });

  it("holds every fill to 3:1 on both grounds in the contrast gate", () => {
    const keys = CONTRAST_PAIRS.map((p) => `${p.fg}/${p.bg}@${p.min}`);
    for (const r of Object.values(REACTIONS)) {
      expect(keys).toContain(`${r.token}/ground@3`);
      expect(keys).toContain(`${r.token}/ground-raised@3`);
    }
  });
});

describe("VERDICT_LABELS", () => {
  it("uses the brand book's four words", () => {
    expect(VERDICT_LABELS).toEqual({
      vindicated: "Vindicated",
      overblown: "Overblown",
      mixed: "Mixed",
      open: "Still out",
    });
  });
});
