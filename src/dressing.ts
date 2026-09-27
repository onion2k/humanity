// Each era's texture: a faint pattern behind its chapter's events. One or two
// cues per era, never pastiche, as the brand book asks. The shapes live here
// and nowhere else: the page draws them, and the dressing contrast gate reads
// the same strengths, so a louder texture is checked against the text over it.
import type { EraId } from "./eras.ts";

export interface Texture {
  /** One tile of the pattern, as SVG shapes in black. It is used as a mask, so it carries shape and no colour. */
  svg: string;
  width: number;
  height: number;
  /** How strongly the era's rule colour shows through the pattern, from 0 to 1. */
  strength: number;
}

export const TEXTURES: Record<EraId, Texture> = {
  // The long courses of cut stone, with the upright joints staggered course by course.
  antiquity: {
    width: 360,
    height: 120,
    strength: 0.4,
    svg: "<rect width='360' height='1'/><rect y='60' width='360' height='1'/><rect width='1' height='60'/><rect x='180' y='60' width='1' height='60'/>",
  },
  // A scribe's ruling: lines at the pitch of a written line, and a double margin rule.
  medieval: {
    width: 1200,
    height: 28,
    strength: 0.5,
    svg: "<rect y='27' width='1200' height='1'/><rect x='40' width='1' height='28'/><rect x='46' width='1' height='28'/>",
  },
  // Handmade laid paper: close laid lines across, and chain lines down.
  print: {
    width: 44,
    height: 3,
    strength: 0.4,
    svg: "<rect width='44' height='0.6' opacity='0.35'/><rect width='1' height='3'/>",
  },
  // The prototype's gaslit wallpaper: two offset grids of small dots.
  industrial: {
    width: 32,
    height: 32,
    strength: 0.55,
    svg: "<circle r='2'/><circle cx='32' r='2'/><circle cy='32' r='2'/><circle cx='32' cy='32' r='2'/><circle cx='16' cy='16' r='1.3'/>",
  },
  // The prototype's Deco pinstripe.
  machine: { width: 56, height: 8, strength: 0.45, svg: "<rect width='1' height='8'/>" },
  // A sparse field of small four-point starbursts, as on a mid-century laminate.
  atomic: {
    width: 120,
    height: 104,
    strength: 0.6,
    svg: "<path d='M20 14l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z'/><path d='M82 64l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z'/><circle cx='98' cy='18' r='1.4'/><circle cx='44' cy='84' r='1.4'/>",
  },
  // A television's scanlines.
  analog: { width: 8, height: 4, strength: 0.35, svg: "<rect width='8' height='1'/>" },
  // A screen's pixel grid.
  digital: {
    width: 12,
    height: 12,
    strength: 0.35,
    svg: "<rect width='12' height='1'/><rect width='1' height='12'/>",
  },
};

/** A texture's tile as a CSS url(), for a mask. */
export function textureTile(era: EraId): string {
  const { svg, width, height } = TEXTURES[era];
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><g fill='black'>${svg}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;
}
