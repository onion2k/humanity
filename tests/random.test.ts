// The seeded source everything random draws from. The same seed must give the
// same run on every machine, or a fuzz failure could never be replayed.
import { describe, expect, it } from "vitest";
import { seeded } from "../src/random.ts";

describe("seeded", () => {
  it("gives the same numbers for the same seed", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it("gives different numbers for different seeds", () => {
    expect(seeded(1).next()).not.toBe(seeded(2).next());
  });

  it("stays in [0, 1), and int and pick stay in range", () => {
    const r = seeded(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = r.int(3, 5);
      expect([3, 4, 5]).toContain(n);
    }
    expect(["a", "b"]).toContain(r.pick(["a", "b"]));
  });

  it("reaches every value in a small range, so no action is starved", () => {
    const r = seeded(3);
    const seen = new Set(Array.from({ length: 200 }, () => r.int(0, 9)));
    expect(seen.size).toBe(10);
  });

  it("refuses to pick from nothing", () => {
    expect(() => seeded(1).pick([])).toThrow();
  });
});
