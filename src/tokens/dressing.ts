// The dressing contrast gate. A texture's lines change the ground under the
// text a little, and this holds the text to its ratio on the ground as
// changed. Without it, a slightly louder texture could take
// the dates below 4.5:1 in one era and nothing would notice.
import { TEXTURES, type Texture } from "../dressing.ts";
import type { EraId } from "../eras.ts";
import { contrastRatio } from "./contrast.ts";
import { resolveColour, type Tokens } from "./tokens.ts";

/** A colour laid over a ground at a strength, as the browser composites it. */
export function overlay(ground: string, colour: string, strength: number): string {
  const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(ground, i) * (1 - strength) + channel(colour, i) * strength)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export interface DressingFailure {
  era: EraId;
  where: "texture";
  text: string;
  ratio: number;
  min: number;
}

/** The text laid over a texture: row titles and the dates beside them. Headings in accent are kept off it. */
const OVER_TEXTURE = ["ink", "ink-muted"];

/** Every era where text over its texture's lines falls below its ratio. */
export function dressingContrastFailures(
  tokens: Tokens,
  textures: Record<EraId, Texture> = TEXTURES,
  overTexture: readonly string[] = OVER_TEXTURE,
): DressingFailure[] {
  return tokens.eras.flatMap((era) => {
    const ground = resolveColour(tokens, "ground", era);
    const textured = overlay(ground, resolveColour(tokens, "rule", era), textures[era].strength);
    return overTexture.flatMap((text) => {
      const ratio = contrastRatio(resolveColour(tokens, text, era), textured);
      return ratio < 4.5 ? [{ era, where: "texture" as const, text, ratio, min: 4.5 }] : [];
    });
  });
}

/** Throws, naming each failure, if any text over a texture falls below its ratio. The build runs this. */
export function assertDressingContrast(tokens: Tokens): void {
  const failures = dressingContrastFailures(tokens);
  if (failures.length === 0) return;
  const lines = failures.map(
    (f) => `  ${f.era} ${f.where}: ${f.text} is ${f.ratio.toFixed(2)}:1, needs ${f.min}:1`,
  );
  throw new Error(`Dressing contrast gate failed:\n${lines.join("\n")}`);
}
