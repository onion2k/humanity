// Each era's art: a tall piece for each margin of its chapter on a wide
// screen, and a square emblem that stands by the chapter's heading where
// there are no margins. One or two cues per era, drawn cleanly, as the brand
// book asks of everything in the skin. The drawings live here and nowhere
// else: each is served as a file of its own, so a chapter fetches its art only
// as the reader nears it, and the page colours it with the era's tokens
// through a mask. Without this module the drawings would be written into the
// page, and every reader would download every era's art before scrolling.
import type { EraId } from "./eras.ts";

export interface Drawing {
  /** The drawing as SVG shapes in black. It is used as a mask, so it carries shape and no colour. */
  svg: string;
  width: number;
  height: number;
}

export const ART_PARTS = ["left", "right", "emblem"] as const;
export type ArtPart = (typeof ART_PARTS)[number];

export type EraArt = Record<ArtPart, Drawing>;

/** A tall piece for a margin: three times as high as it is wide. */
const tall = (svg: string): Drawing => ({ svg, width: 120, height: 360 });
/** A square emblem. */
const square = (svg: string): Drawing => ({ svg, width: 64, height: 64 });

/** Numbers written to a tenth, which is finer than any screen will show the art. */
const n = (value: number): string => String(Math.round(value * 10) / 10);

/** A filled shape. */
const solid = (d: string, extra = ""): string => `<path d='${d}'${extra}/>`;
/** A drawn line, round at its ends and corners. */
const line = (d: string, width = 3, extra = ""): string =>
  `<path d='${d}' fill='none' stroke-width='${n(width)}'${extra}/>`;
const ring = (cx: number, cy: number, r: number, width = 3): string =>
  `<circle cx='${n(cx)}' cy='${n(cy)}' r='${n(r)}' fill='none' stroke-width='${n(width)}'/>`;
const dot = (cx: number, cy: number, r: number): string =>
  `<circle cx='${n(cx)}' cy='${n(cy)}' r='${n(r)}'/>`;
const block = (x: number, y: number, w: number, h: number, rx = 0): string =>
  `<rect x='${n(x)}' y='${n(y)}' width='${n(w)}' height='${n(h)}'${rx ? ` rx='${n(rx)}'` : ""}/>`;
const frame = (x: number, y: number, w: number, h: number, rx = 0, width = 3): string =>
  `<rect x='${n(x)}' y='${n(y)}' width='${n(w)}' height='${n(h)}'${rx ? ` rx='${n(rx)}'` : ""} fill='none' stroke-width='${n(width)}'/>`;

/** A running Greek key along a strip, one unit every 24 across, 20 high, from its top left corner. */
function meander(x: number, y: number, units: number): string {
  let d = `M${n(x)} ${n(y + 20)}`;
  for (let i = 0; i < units; i++) {
    const u = x + i * 24;
    d += ` L${n(u)} ${n(y)} L${n(u + 18)} ${n(y)} L${n(u + 18)} ${n(y + 14)} L${n(u + 7)} ${n(y + 14)} L${n(u + 7)} ${n(y + 7)} L${n(u + 12)} ${n(y + 7)} M${n(u)} ${n(y + 20)} L${n(u + 24)} ${n(y + 20)}`;
  }
  return line(d, 2.5);
}

/** A cog: a toothed wheel with a hole at its hub. */
function gear(cx: number, cy: number, r: number, teeth: number): string {
  const points: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, radius] of [
      [0, r - 4],
      [step * 0.2, r + 4],
      [step * 0.5, r + 4],
      [step * 0.7, r - 4],
    ] as const) {
      points.push(`${n(cx + radius * Math.cos(a + da))} ${n(cy + radius * Math.sin(a + da))}`);
    }
  }
  const hub = r * 0.32;
  return solid(
    `M${points.join(" L")} Z M${n(cx - hub)} ${n(cy)} a${n(hub)} ${n(hub)} 0 1 0 ${n(hub * 2)} 0 a${n(hub)} ${n(hub)} 0 1 0 ${n(-hub * 2)} 0 Z`,
    " fill-rule='evenodd'",
  );
}

/** A four-point starburst, as on a mid-century laminate. */
function starburst(cx: number, cy: number, size: number): string {
  const s = size;
  const w = size * 0.22;
  return solid(
    `M${n(cx)} ${n(cy - s)} L${n(cx + w)} ${n(cy - w)} L${n(cx + s)} ${n(cy)} L${n(cx + w)} ${n(cy + w)} L${n(cx)} ${n(cy + s)} L${n(cx - w)} ${n(cy + w)} L${n(cx - s)} ${n(cy)} L${n(cx - w)} ${n(cy - w)} Z`,
  );
}

/** Rays fanned over the top half of a circle, each a thin wedge, as on a Deco sunburst. */
function sunburst(cx: number, cy: number, inner: number, outer: number, rays: number): string {
  const wedges: string[] = [];
  for (let i = 0; i < rays; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / rays;
    const half = Math.PI / rays / 3;
    const at = (angle: number, radius: number): string =>
      `${n(cx + radius * Math.cos(angle))} ${n(cy + radius * Math.sin(angle))}`;
    wedges.push(
      `M${at(a - half * 0.4, inner)} L${at(a - half, outer)} L${at(a + half, outer)} L${at(a + half * 0.4, inner)} Z`,
    );
  }
  return solid(wedges.join(" "));
}

/** Arcs either side of a point, like a signal going out from a mast. */
function signal(cx: number, cy: number, radii: readonly number[], width = 3): string {
  const k = Math.SQRT1_2;
  return radii
    .map((r) =>
      line(
        `M${n(cx - r * k)} ${n(cy - r * k)} A${n(r)} ${n(r)} 0 0 0 ${n(cx - r * k)} ${n(cy + r * k)} M${n(cx + r * k)} ${n(cy - r * k)} A${n(r)} ${n(r)} 0 0 1 ${n(cx + r * k)} ${n(cy + r * k)}`,
        width,
      ),
    )
    .join("");
}

/** A picture drawn in square pixels from rows of "#" and ".". */
function pixels(x: number, y: number, size: number, rows: readonly string[]): string {
  const cells: string[] = [];
  rows.forEach((row, j) => {
    // Runs of lit pixels along a row become one rectangle, which keeps the file small.
    let i = 0;
    while (i < row.length) {
      if (row[i] !== "#") {
        i++;
        continue;
      }
      let end = i;
      while (row[end] === "#") end++;
      cells.push(
        `M${n(x + i * size)} ${n(y + j * size)}h${n((end - i) * size)}v${n(size)}h${n(-(end - i) * size)}Z`,
      );
      i = end;
    }
  });
  return solid(cells.join(""));
}

/** The pointer every screen has shown since the first windowed computers, outlined. */
const CURSOR = [
  "#...........",
  "##..........",
  "#.#.........",
  "#..#........",
  "#...#.......",
  "#....#......",
  "#.....#.....",
  "#......#....",
  "#.......#...",
  "#........#..",
  "#.........#.",
  "#......#####",
  "#...#..#....",
  "#..##..#....",
  "#.#..#..#...",
  "##...#..#...",
  "#.....#..#..",
  "......#..#..",
  ".......##...",
];

/** An ellipse turned about its own centre. */
const orbit = (cx: number, cy: number, rx: number, ry: number, turn: number, width = 3): string =>
  `<ellipse cx='${n(cx)}' cy='${n(cy)}' rx='${n(rx)}' ry='${n(ry)}' transform='rotate(${n(turn)} ${n(cx)} ${n(cy)})' fill='none' stroke-width='${n(width)}'/>`;

/** A lattice mast narrowing from its feet to its top, braced across at every level. */
function mast(baseY: number, topY: number, baseHalf: number, topHalf: number, levels: number): string {
  const cx = 60;
  const half = (y: number): number => topHalf + ((y - topY) / (baseY - topY)) * (baseHalf - topHalf);
  let d = `M${n(cx - baseHalf)} ${n(baseY)} L${n(cx - topHalf)} ${n(topY)} M${n(cx + baseHalf)} ${n(baseY)} L${n(cx + topHalf)} ${n(topY)}`;
  for (let i = 0; i < levels; i++) {
    const y0 = topY + ((baseY - topY) * i) / levels;
    const y1 = topY + ((baseY - topY) * (i + 1)) / levels;
    d += ` M${n(cx - half(y0))} ${n(y0)} L${n(cx + half(y1))} ${n(y1)} M${n(cx + half(y0))} ${n(y0)} L${n(cx - half(y1))} ${n(y1)} M${n(cx - half(y1))} ${n(y1)} L${n(cx + half(y1))} ${n(y1)}`;
  }
  return line(d, 2.5);
}

/** A mid-century boomerang, laid at an angle. */
const boomerang = (x: number, y: number, turn: number): string =>
  solid(`M-22 6 Q0 -16 22 6 Q0 -6 -22 6 Z`, ` transform='translate(${n(x)} ${n(y)}) rotate(${n(turn)})'`);

export const ART: Record<EraId, EraArt> = {
  // Carved stone and fired clay: an Ionic column, and an amphora between two runs of Greek key.
  antiquity: {
    left: tall(
      [
        block(4, 12, 112, 6),
        block(4, 22, 112, 12),
        block(14, 40, 92, 8),
        ring(24, 60, 10),
        dot(24, 60, 3.5),
        ring(96, 60, 10),
        dot(96, 60, 3.5),
        block(24, 50, 72, 6),
        block(30, 72, 60, 5),
        line("M31 80 L28 300 M89 80 L92 300"),
        line("M41 84 L40 296 M50.5 84 L50.3 296 M60 84 L60 296 M69.5 84 L69.7 296 M79 84 L80 296", 2),
        block(22, 300, 76, 8, 4),
        block(18, 312, 84, 8, 4),
        block(12, 324, 96, 14),
      ].join(""),
    ),
    right: tall(
      [
        meander(0, 8, 5),
        block(44, 44, 32, 6, 2),
        line("M49 50 L49 92 M71 50 L71 92"),
        line("M49 60 C28 60 28 100 40 108 M71 60 C92 60 92 100 80 108"),
        line(
          "M49 92 C20 112 14 172 30 222 C40 252 52 272 56 290 L64 290 C68 272 80 252 90 222 C106 172 100 112 71 92",
        ),
        line("M25 138 L95 138 M22 166 L98 166", 2.5),
        line("M28 160 L35 144 L42 160 L49 144 L56 160 L63 144 L70 160 L77 144 L84 160 L91 144", 2),
        dot(40, 200, 3),
        dot(52, 204, 3),
        dot(60, 205, 3),
        dot(68, 204, 3),
        dot(80, 200, 3),
        block(50, 290, 20, 8),
        block(44, 298, 32, 6, 2),
        meander(0, 332, 5),
      ].join(""),
    ),
    emblem: square(
      [
        block(24, 6, 16, 4, 1.5),
        solid(
          "M27 10 L37 10 L37 18 C50 24 52 38 44 48 C40 53 36 56 35 58 L29 58 C28 56 24 53 20 48 C12 38 14 24 27 18 Z",
        ),
        line("M27 13 C18 13 17 24 22 27 M37 13 C46 13 47 24 42 27", 3),
      ].join(""),
    ),
  },
  // Stone, glass and heraldry: a lancet window with its tracery, and a tower flying its pennant.
  medieval: {
    left: tall(
      [
        line("M20 340 L20 120 A80 80 0 0 1 60 50.7 A80 80 0 0 1 100 120 L100 340", 4),
        line(
          "M28 330 L28 150 A30 30 0 0 1 43 124 A30 30 0 0 1 58 150 L58 330 M62 330 L62 150 A30 30 0 0 1 77 124 A30 30 0 0 1 92 150 L92 330",
        ),
        ring(60, 92, 17),
        ring(52, 92, 6.5, 2),
        ring(68, 92, 6.5, 2),
        ring(60, 84, 6.5, 2),
        ring(60, 100, 6.5, 2),
        line("M28 200 L58 200 M62 200 L92 200 M28 264 L58 264 M62 264 L92 264", 2),
        block(10, 338, 100, 10),
      ].join(""),
    ),
    right: tall(
      [
        line("M60 84 L60 18", 3),
        solid("M62 20 L104 27 L92 33 L104 40 L62 46 Z"),
        block(24, 82, 12, 16),
        block(44, 82, 12, 16),
        block(64, 82, 12, 16),
        block(84, 82, 12, 16),
        block(24, 96, 72, 14),
        frame(30, 110, 60, 238),
        line("M30 150 L90 150 M30 212 L90 212 M30 272 L90 272", 2),
        block(57, 166, 6, 28, 3),
        block(57, 228, 6, 28, 3),
        solid("M48 348 L48 316 A12 12 0 0 1 72 316 L72 348 Z"),
      ].join(""),
    ),
    emblem: square(
      [
        line("M10 8 L54 8 L54 30 C54 46 42 56 32 60 C22 56 10 46 10 30 Z", 4),
        line("M16 40 L32 25 L48 40", 6),
      ].join(""),
    ),
  },
  // The trade itself: a wooden screw press, and a stack of bound books under a quill in its ink.
  print: {
    left: tall(
      [
        block(4, 28, 112, 10),
        block(8, 38, 104, 18),
        block(14, 56, 12, 280),
        block(94, 56, 12, 280),
        line(
          "M54 60 L66 68 L54 76 L66 84 L54 92 L66 100 L54 108 L66 116 L54 124 L66 132 L54 140 L66 148 L54 156 L66 164",
          3,
        ),
        line("M26 124 L94 104", 4),
        block(30, 166, 60, 12),
        frame(34, 212, 52, 18, 0, 2.5),
        line("M40 218 L80 218 M40 224 L72 224", 1.5),
        block(20, 230, 80, 10),
        block(14, 300, 92, 10),
        block(4, 336, 40, 10),
        block(76, 336, 40, 10),
      ].join(""),
    ),
    right: tall(
      [
        solid("M62 158 C68 118 80 78 102 34 C90 70 78 112 66 158 Z"),
        line("M64 150 C74 112 84 80 98 44", 1.5),
        block(46, 158, 28, 30, 4),
        frame(28, 190, 70, 24),
        frame(16, 214, 88, 26),
        frame(24, 240, 76, 26),
        frame(8, 266, 100, 24),
        frame(20, 290, 84, 28),
        frame(12, 318, 96, 28),
        line(
          "M40 190 L40 214 M86 190 L86 214 M28 214 L28 240 M92 214 L92 240 M36 240 L36 266 M88 240 L88 266 M20 266 L20 290 M96 266 L96 290 M32 290 L32 318 M92 290 L92 318 M24 318 L24 346 M96 318 L96 346",
          2,
        ),
      ].join(""),
    ),
    emblem: square(
      [
        line(
          "M6 16 C18 12 26 14 32 20 C38 14 46 12 58 16 L58 50 C46 46 38 48 32 54 C26 48 18 46 6 50 Z",
          3.5,
        ),
        line("M32 20 L32 54"),
        line("M12 25 L26 27 M12 32 L26 34 M12 39 L26 41 M38 27 L52 25 M38 34 L52 32 M38 41 L52 39", 2),
      ].join(""),
    ),
  },
  // Steam and gas: a train of meshing cogs down to a pressure gauge, and a gas lamp giving off its glow.
  industrial: {
    left: tall(
      [
        gear(60, 62, 40, 12),
        gear(46, 131, 26, 8),
        gear(78, 190, 36, 11),
        gear(52, 250, 22, 7),
        ring(66, 316, 26, 4),
        line("M66 316 L82 300", 3),
        dot(66, 316, 4),
        line("M46 330 L50 327 M86 330 L82 327 M66 294 L66 298 M44 316 L48 316 M88 316 L84 316", 2),
      ].join(""),
    ),
    right: tall(
      [
        dot(60, 18, 5),
        solid("M40 42 L60 24 L80 42 Z"),
        line("M42 46 L78 46 L72 98 L48 98 Z M60 46 L60 98"),
        solid("M60 60 C67 70 67 80 60 86 C53 80 53 70 60 60 Z"),
        line("M24 72 L32 72 M88 72 L96 72 M30 44 L36 50 M90 44 L84 50 M30 100 L36 94 M90 100 L84 94", 2.5),
        block(44, 98, 32, 6),
        line("M34 118 L86 118", 4),
        dot(34, 118, 4),
        dot(86, 118, 4),
        solid("M54 104 L66 104 L68 320 L52 320 Z"),
        block(49, 150, 22, 6, 2),
        block(49, 262, 22, 6, 2),
        solid("M40 320 L80 320 L86 344 L34 344 Z"),
        block(28, 344, 64, 8),
      ].join(""),
    ),
    emblem: square(gear(32, 32, 22, 10)),
  },
  // Deco on the skyline and on the air: a stepped tower with its spire, and a radio mast sending out its signal.
  machine: {
    left: tall(
      [
        solid("M60 6 L64 64 L56 64 Z"),
        line("M46 94 A14 14 0 0 1 74 94 M41 112 A19 19 0 0 1 79 112 M36 132 A24 24 0 0 1 84 132"),
        frame(36, 132, 48, 60),
        frame(26, 192, 68, 70),
        frame(16, 262, 88, 86),
        line(
          "M48 136 L48 188 M60 136 L60 188 M72 136 L72 188 M38 196 L38 258 M52 196 L52 258 M68 196 L68 258 M82 196 L82 258 M28 266 L28 344 M44 266 L44 344 M60 266 L60 344 M76 266 L76 344 M92 266 L92 344",
          2,
        ),
        block(6, 348, 108, 6),
      ].join(""),
    ),
    right: tall(
      [signal(60, 50, [16, 28, 40]), dot(60, 50, 6), mast(340, 62, 34, 5, 9), block(18, 340, 84, 8)].join(""),
    ),
    emblem: square(
      [sunburst(32, 52, 13, 44, 9), solid("M18 52 A14 14 0 0 1 46 52 Z"), block(4, 54, 56, 4)].join(""),
    ),
  },
  // The space age at home: a finned rocket among starbursts, and an atom over a spread of boomerangs.
  atomic: {
    left: tall(
      [
        starburst(22, 40, 10),
        starburst(98, 70, 7),
        line("M60 20 C76 50 80 90 80 150 L80 250 L40 250 L40 150 C40 90 44 50 60 20 Z", 3.5),
        ring(60, 112, 10),
        ring(60, 150, 6),
        line("M40 184 L80 184", 2.5),
        solid("M40 200 L14 270 L40 250 Z"),
        solid("M80 200 L106 270 L80 250 Z"),
        block(57, 206, 6, 62, 3),
        solid("M46 250 L74 250 L70 264 L50 264 Z"),
        starburst(60, 298, 20),
        starburst(38, 334, 9),
        starburst(84, 326, 11),
      ].join(""),
    ),
    right: tall(
      [
        orbit(60, 110, 50, 17, 0),
        orbit(60, 110, 50, 17, 60),
        orbit(60, 110, 50, 17, 120),
        dot(60, 110, 8),
        dot(110, 110, 4.5),
        dot(35, 66.7, 4.5),
        dot(35, 153.3, 4.5),
        boomerang(38, 214, -20),
        boomerang(82, 252, 25),
        boomerang(40, 300, 10),
        starburst(92, 206, 7),
        starburst(80, 324, 8),
        starburst(20, 262, 5),
      ].join(""),
    ),
    emblem: square(
      [
        orbit(32, 32, 27, 9.5, 0),
        orbit(32, 32, 27, 9.5, 60),
        orbit(32, 32, 27, 9.5, 120),
        dot(32, 32, 5),
      ].join(""),
    ),
  },
  // The living room: a rising sun over rainbow stripes, and a television on its legs above a cassette.
  analog: {
    left: tall(
      [
        dot(60, 34, 13),
        line("M14 350 L14 122 A46 46 0 0 1 106 122 L106 350", 8),
        line("M28 350 L28 122 A32 32 0 0 1 92 122 L92 350", 8),
        line("M42 350 L42 122 A18 18 0 0 1 78 122 L78 350", 8),
      ].join(""),
    ),
    right: tall(
      [
        line("M60 72 L30 16 M60 72 L94 22", 3),
        dot(30, 16, 4),
        dot(94, 22, 4),
        solid("M50 78 A10 10 0 0 1 70 78 Z"),
        frame(8, 80, 104, 86, 12, 4),
        frame(18, 92, 66, 62, 14, 3),
        ring(98, 106, 6, 2.5),
        ring(98, 130, 6, 2.5),
        line("M92 146 L104 146 M92 152 L104 152", 2),
        line("M24 166 L16 198 M96 166 L104 198", 4),
        frame(10, 232, 100, 66, 6),
        frame(22, 244, 76, 28, 3, 2),
        ring(42, 258, 8),
        ring(78, 258, 8),
        line("M30 298 L36 284 L84 284 L90 298", 2),
        line("M10 322 L110 322 M10 336 L110 336 M10 350 L110 350", 6),
      ].join(""),
    ),
    emblem: square(
      [
        line("M32 18 L18 4 M32 18 L46 6", 2.5),
        frame(5, 20, 54, 38, 7, 3.5),
        frame(11, 26, 34, 26, 7, 3),
        dot(51, 32, 2.5),
        dot(51, 42, 2.5),
      ].join(""),
    ),
  },
  // The screen and the net: the pointer among stray pixels, and a phone under a signal above a browser window.
  digital: {
    left: tall(
      [
        pixels(12, 30, 8, CURSOR),
        block(24, 210, 12, 12),
        block(64, 222, 8, 8),
        block(88, 196, 8, 8),
        block(40, 252, 8, 8),
        block(80, 268, 12, 12),
        block(16, 296, 8, 8),
        block(56, 306, 8, 8),
        block(96, 318, 8, 8),
        block(32, 336, 12, 12),
        block(72, 346, 8, 8),
      ].join(""),
    ),
    right: tall(
      [
        dot(60, 32, 4),
        line("M50 24 A14 14 0 0 1 70 24 M44 17 A22 22 0 0 1 76 17 M38 10 A30 30 0 0 1 82 10", 3),
        frame(16, 44, 88, 180, 14, 4),
        frame(24, 62, 72, 138, 4, 2),
        line("M50 53 L70 53", 3),
        ring(60, 212, 6, 2),
        block(32, 72, 16, 16, 4),
        block(52, 72, 16, 16, 4),
        block(72, 72, 16, 16, 4),
        block(32, 96, 16, 16, 4),
        block(52, 96, 16, 16, 4),
        block(72, 96, 16, 16, 4),
        block(32, 120, 16, 16, 4),
        block(52, 120, 16, 16, 4),
        frame(12, 252, 96, 76, 4),
        line("M12 266 L108 266", 3),
        dot(22, 259, 2.5),
        dot(31, 259, 2.5),
        dot(40, 259, 2.5),
        block(22, 278, 60, 6),
        block(22, 292, 76, 6),
        block(22, 306, 40, 6),
      ].join(""),
    ),
    emblem: square(pixels(14, 5, 3, CURSOR)),
  },
};

/** How strongly the era's accent shows through its margin art, from 0 to 1. The emblem is drawn at full strength. */
const STRENGTH: Record<EraId, number> = {
  antiquity: 0.3,
  medieval: 0.3,
  print: 0.3,
  industrial: 0.35,
  machine: 0.3,
  atomic: 0.3,
  analog: 0.35,
  digital: 0.3,
};

export function artStrength(era: EraId): number {
  return STRENGTH[era];
}

/** The name a drawing is served under, without its extension. */
export function artFileName(era: EraId, part: ArtPart): string {
  return `${era}-${part}`;
}

/** Where the page finds a drawing. */
export function artUrl(era: EraId, part: ArtPart): string {
  return `/art/${artFileName(era, part)}.svg`;
}

/** A drawing as a whole SVG file. Strokes are drawn round, so line art stays clean at any size. */
export function artFile({ svg, width, height }: Drawing): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><g fill="black" stroke="black" stroke-width="0" stroke-linecap="round" stroke-linejoin="round">${svg}</g></svg>`;
}
