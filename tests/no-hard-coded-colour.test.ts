// Every colour on the page comes from tokens.json. A hex or rgb() written by
// hand would skip the contrast gate and ignore the era theme, so this fails
// the build when one appears anywhere in the source.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/gi;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|css|ts|js)$/.test(entry.name) ? [path] : [];
  });
}

/** Colours written into a piece of source. */
function hardCodedColours(source: string): string[] {
  return [...source.matchAll(COLOUR)].map((m) => m[0]);
}

describe("hardCodedColours", () => {
  it("finds hex and colour functions", () => {
    expect(hardCodedColours("color: #1f2420; background: rgb(0 0 0);")).toEqual(["#1f2420", "rgb("]);
  });

  it("leaves token references alone", () => {
    expect(
      hardCodedColours("color: var(--ink); background: color-mix(in oklab, var(--a), var(--b));"),
    ).toEqual([]);
  });
});

describe("the source", () => {
  it("has no colour outside tokens.json", () => {
    const found = sourceFiles(join(ROOT, "src"))
      .filter((f) => !f.endsWith("tokens.css"))
      .flatMap((f) => hardCodedColours(readFileSync(f, "utf8")).map((c) => `${relative(ROOT, f)}: ${c}`));
    expect(found).toEqual([]);
  });
});
