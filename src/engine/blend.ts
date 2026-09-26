// How far through a seam the reader is, and what that means for the page: how
// far the ground has blended, which era's text colours are showing, and how
// strongly each piece of seam text shows. Pure numbers in and out, so the
// whole change of era can be checked headless.

/** The blend runs over the middle 40% of the seam, as the brand book asks. */
export const BLEND_START = 0.3;
export const BLEND_SPAN = 0.4;
/** Text fades over this much of the blend, finishing at its limit. */
export const FADE_BAND = 0.05;

export interface Blend {
  /** How far the middle of the viewport is through the seam, from 0 to 1. */
  raw: number;
  /** How far the ground has blended from the earlier era to the later, eased. */
  pc: number;
  /** Which era's text colours show: 0 before the midpoint, 1 from it. */
  pi: 0 | 1;
}

/** Which way a piece of text fades: gone by `until` before the midpoint, back from `from` after it. Null never fades. */
export interface Fade {
  until: number | null;
  from: number | null;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function seamRaw(top: number, height: number, viewportHeight: number): number {
  return clamp((viewportHeight / 2 - top) / height);
}

/** Under reduced motion the whole change happens at once, at the midpoint. */
export function blendAt(raw: number, reducedMotion = false): Blend {
  const pi = raw >= 0.5 ? 1 : 0;
  const pc = reducedMotion ? pi : smoothstep(clamp((raw - BLEND_START) / BLEND_SPAN));
  return { raw, pc, pi };
}

export function textOpacity(pc: number, fade: Fade): number {
  if (pc < 0.5) return fade.until === null ? 1 : clamp((fade.until - pc) / FADE_BAND);
  return fade.from === null ? 1 : clamp((pc - fade.from) / FADE_BAND);
}
