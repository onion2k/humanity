// The seam text gate. A seam's ground blends from one era to the next, and in
// the four light–dark crossings it passes through mid-tones no text can sit
// on. So each piece of seam text fades out before the blend takes it below
// its ratio, and this works out when, from the palette. Without it, text would
// either fade on a fixed timing that fails the dark crossings, or have to be
// tuned by hand every time a colour changed.
import { ERAS, type EraId } from "../eras.ts";
import { blendAt, textOpacity, type Fade } from "../engine/blend.ts";
import { contrastRatio } from "./contrast.ts";
import { mixOklab } from "./oklab.ts";
import { resolveColour, type Tokens } from "./tokens.ts";

export interface SeamFades {
  caption: Fade;
  year: Fade;
}

/** Each text layer on a seam: the token it is set in and the ratio it must hold. */
const LAYERS = {
  caption: { token: "ink-muted", min: 4.5 },
  year: { token: "accent", min: 3 },
} as const;

/** The caption always fades through the middle of the blend, as in the prototype, even where contrast would allow more. */
const CAPTION_LIMITS = { until: 0.4, from: 0.6 };

const STEP = 0.001;

function groundAt(tokens: Tokens, from: EraId, to: EraId, pc: number): string {
  return mixOklab(resolveColour(tokens, "ground", from), resolveColour(tokens, "ground", to), pc);
}

/**
 * How far into the blend a layer can go from one end before its era's colour drops below its ratio on the
 * blending ground, or null if it never does before the midpoint.
 */
function reach(
  tokens: Tokens,
  from: EraId,
  to: EraId,
  token: string,
  min: number,
  side: "from" | "to",
): number | null {
  const era = side === "from" ? from : to;
  const colour = resolveColour(tokens, token, era);
  let last = 0;
  for (let k = 0; k <= 0.5 / STEP; k++) {
    const distance = k * STEP;
    const pc = side === "from" ? distance : 1 - distance;
    if (contrastRatio(colour, groundAt(tokens, from, to, pc)) < min) return last;
    last = distance;
  }
  return null;
}

export function seamFades(tokens: Tokens, from: EraId, to: EraId): SeamFades {
  const edges = (token: string, min: number): Fade => {
    const early = reach(tokens, from, to, token, min, "from");
    const late = reach(tokens, from, to, token, min, "to");
    return { until: early, from: late === null ? null : 1 - late };
  };
  const caption = edges(LAYERS.caption.token, LAYERS.caption.min);
  return {
    caption: {
      until: Math.min(caption.until ?? 1, CAPTION_LIMITS.until),
      from: Math.max(caption.from ?? 0, CAPTION_LIMITS.from),
    },
    year: edges(LAYERS.year.token, LAYERS.year.min),
  };
}

export interface SeamTextFailure {
  from: EraId;
  to: EraId;
  layer: keyof typeof LAYERS;
  pc: number;
  colour: string;
  ground: string;
  ratio: number;
  min: number;
}

/** Every point, in every seam, where a visible layer of text falls below its ratio. Empty means the gate passes. */
export function seamTextFailures(
  tokens: Tokens,
  fadesFor: (from: EraId, to: EraId) => SeamFades = (from, to) => seamFades(tokens, from, to),
  steps = 1000,
): SeamTextFailure[] {
  const failures: SeamTextFailure[] = [];
  for (let i = 0; i < ERAS.length - 1; i++) {
    const from = ERAS[i]?.id;
    const to = ERAS[i + 1]?.id;
    if (from === undefined || to === undefined) continue;
    const fades = fadesFor(from, to);
    for (let k = 0; k <= steps; k++) {
      const { pc, pi } = blendAt(k / steps);
      const ground = groundAt(tokens, from, to, pc);
      for (const layer of Object.keys(LAYERS) as (keyof typeof LAYERS)[]) {
        if (textOpacity(pc, fades[layer]) === 0) continue;
        const { token, min } = LAYERS[layer];
        const colour = resolveColour(tokens, token, pi === 1 ? to : from);
        const ratio = contrastRatio(colour, ground);
        if (ratio < min) failures.push({ from, to, layer, pc, colour, ground, ratio, min });
      }
    }
  }
  return failures;
}

/** Throws, naming the worst point in each failing seam, if any visible seam text drops below its ratio. The build runs this. */
export function assertSeamText(tokens: Tokens): void {
  const failures = seamTextFailures(tokens);
  if (failures.length === 0) return;
  const worst = new Map<string, SeamTextFailure>();
  for (const f of failures) {
    const key = `${f.from}→${f.to} ${f.layer}`;
    const seen = worst.get(key);
    if (!seen || f.ratio < seen.ratio) worst.set(key, f);
  }
  const lines = [...worst.entries()].map(
    ([key, f]) =>
      `  ${key}: ${f.ratio.toFixed(2)}:1 at ${(f.pc * 100).toFixed(1)}% through the blend, needs ${f.min}:1`,
  );
  throw new Error(`Seam text gate failed:\n${lines.join("\n")}`);
}
