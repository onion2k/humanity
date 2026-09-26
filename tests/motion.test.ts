// Every animation and transition in the page's source has to sit inside a
// @media (prefers-reduced-motion: no-preference) block, so a reader who has
// asked for less motion never gets any. Nothing moves yet; this is the gate
// that keeps it so as card entrances and the like arrive.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

const MOTION = /(?:^|[;{\s])((?:animation|transition)(?:-[a-z-]+)?)\s*:/g;
const GUARD = /@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*$/;

/** The motion properties in a stylesheet that are not inside a no-preference block. */
function unguardedMotion(source: string): string[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  // Each open block, and whether it or a block around it allows motion.
  const open: boolean[] = [];
  let start = 0;
  for (let i = 0; i <= css.length; i++) {
    const c = css[i];
    if (c !== "{" && c !== "}" && c !== ";" && i < css.length) continue;
    const piece = css.slice(start, i);
    const guarded = open.includes(true);
    if (c === "{") {
      open.push(GUARD.test(piece.trim()));
    } else {
      if (!guarded) for (const m of `;${piece}`.matchAll(MOTION)) if (m[1]) found.push(m[1]);
      if (c === "}") open.pop();
    }
    start = i + 1;
  }
  return found;
}

function styleSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return styleSources(path);
    return /\.(astro|css)$/.test(entry.name) && entry.name !== "tokens.css" ? [path] : [];
  });
}

describe("unguardedMotion", () => {
  it("finds an animation or transition outside a no-preference block", () => {
    expect(unguardedMotion(".a { transition: opacity 1s; }")).toEqual(["transition"]);
    expect(unguardedMotion(".a { animation: press 1s both; }")).toEqual(["animation"]);
    expect(unguardedMotion(".a { animation-name: press; transition-property: opacity; }")).toEqual([
      "animation-name",
      "transition-property",
    ]);
  });

  it("leaves one inside a no-preference block alone, however deep", () => {
    expect(
      unguardedMotion(
        "@media (prefers-reduced-motion: no-preference) { @supports (animation-timeline: view()) { .a { animation: x 1s; } } }",
      ),
    ).toEqual([]);
  });

  it("still finds one after a no-preference block has closed", () => {
    expect(
      unguardedMotion(
        "@media (prefers-reduced-motion: no-preference) { .a { transition: none; } } .b { transition: x 1s; }",
      ),
    ).toEqual(["transition"]);
  });

  it("does not count a reduce block as a guard, since that is where motion is turned off", () => {
    expect(unguardedMotion("@media (prefers-reduced-motion: reduce) { .a { transition: x 1s; } }")).toEqual([
      "transition",
    ]);
  });

  it("ignores comments, custom properties and at-rule conditions", () => {
    expect(
      unguardedMotion(
        "/* transition: x */ .a { --transition-length: 1s; } @supports (animation-timeline: view()) {}",
      ),
    ).toEqual([]);
  });
});

describe("the page's styles", () => {
  it("move nothing unless the reader allows motion", () => {
    const found = styleSources(join(ROOT, "src")).flatMap((file) =>
      unguardedMotion(readFileSync(file, "utf8")).map((property) => `${relative(ROOT, file)}: ${property}`),
    );
    expect(found).toEqual([]);
  });
});
