// The one source of chance. Anything that needs a random choice, in the page
// or in a test, draws from a seeded stream from here, so the same seed always
// gives the same run and any failure it finds can be replayed.

export interface Random {
  /** A number in [0, 1). */
  next(): number;
  /** A whole number from min to max, both included. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Mulberry32: small, fast and good enough for choosing what to do next. */
export function seeded(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      const item = items[int(0, items.length - 1)];
      if (item === undefined) throw new Error("Cannot pick from an empty list");
      return item;
    },
  };
}
