// Colours in oklab, the space the seams blend in. The seam text gate mixes two
// grounds here exactly as CSS color-mix(in oklab, …) does in the browser, so
// the contrast it checks is the contrast the reader gets.

export type Oklab = [number, number, number];

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklab(hex: string): Oklab {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Cannot read colour "${hex}": expected #rrggbb`);
  const digits = m[1];
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(digits.slice(i, i + 2), 16) / 255)) as Oklab;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s,
  ];
}

/** Back to hex, clipping to what a screen can show, as the browser does. */
export function oklabToHex([L, a, b]: Oklab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, fromLinear(c))) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** The colour `amount` of the way from a to b, as color-mix(in oklab, a, b amount) gives it. */
export function mixOklab(a: string, b: string, amount: number): string {
  const [A, B] = [hexToOklab(a), hexToOklab(b)];
  return oklabToHex([0, 1, 2].map((i) => A[i as 0] + (B[i as 0] - A[i as 0]) * amount) as Oklab);
}
