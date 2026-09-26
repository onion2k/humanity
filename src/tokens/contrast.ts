// The WCAG contrast check behind the contrast gate. It lists every pair the
// brand book promises and the ratio each must hold, so a palette change that
// breaks readability in one era is caught before it ships.
import type { EraId } from "../eras.ts";
import { REACTIONS } from "../reactions.ts";
import { resolveColour, type Tokens } from "./tokens.ts";

export interface ContrastPair {
  fg: string;
  bg: string;
  /** 4.5 for text, 3 for marks and focus rings (WCAG 1.4.3 and 1.4.11). */
  min: number;
}

export interface ContrastFailure extends ContrastPair {
  era: EraId;
  ratio: number;
}

/** Every pair from the brand book's colour section and the tokens' own usage notes. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: "ink", bg: "ground", min: 4.5 },
  { fg: "ink", bg: "ground-raised", min: 4.5 },
  { fg: "ink", bg: "accent-soft", min: 4.5 },
  { fg: "ink-muted", bg: "ground", min: 4.5 },
  { fg: "ink-muted", bg: "ground-raised", min: 4.5 },
  { fg: "accent", bg: "ground", min: 4.5 },
  { fg: "accent", bg: "ground-raised", min: 4.5 },
  { fg: "on-accent", bg: "accent", min: 4.5 },
  { fg: "focus", bg: "ground", min: 3 },
  { fg: "focus", bg: "ground-raised", min: 3 },
  // The brand book leaves these out. Colour only reinforces a reaction, but
  // the shape carries it, and a shape that fades into the ground says nothing.
  ...Object.values(REACTIONS).flatMap(({ token: fg }) => [
    { fg, bg: "ground", min: 3 },
    { fg, bg: "ground-raised", min: 3 },
  ]),
];

function channels(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Cannot read colour "${hex}": expected #rgb or #rrggbb`);
  const digits = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG 2 contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every pair, in every era, with its ratio. */
export function measureContrast(
  tokens: Tokens,
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS,
): ContrastFailure[] {
  return tokens.eras.flatMap((era) =>
    pairs.map((pair) => ({
      ...pair,
      era,
      ratio: contrastRatio(resolveColour(tokens, pair.fg, era), resolveColour(tokens, pair.bg, era)),
    })),
  );
}

/** The pairs that fall below their ratio. An empty list means the gate passes. */
export function checkContrast(
  tokens: Tokens,
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS,
): ContrastFailure[] {
  return measureContrast(tokens, pairs).filter((m) => m.ratio < m.min);
}

/** Throws, naming every failing pair, if any pair falls below its ratio. The build runs this. */
export function assertContrast(tokens: Tokens, pairs: readonly ContrastPair[] = CONTRAST_PAIRS): void {
  const failures = checkContrast(tokens, pairs);
  if (failures.length === 0) return;
  const lines = failures.map(
    (f) => `  ${f.era}: ${f.fg} on ${f.bg} is ${f.ratio.toFixed(2)}:1, needs ${f.min}:1`,
  );
  throw new Error(`Contrast gate failed in design-system/tokens.json:\n${lines.join("\n")}`);
}
