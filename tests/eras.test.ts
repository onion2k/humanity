// Every year lands in exactly one era, and the boundaries are the brand
// book's. A year on the wrong side of a boundary would put an event in the
// wrong skin and the wrong chapter.
import { describe, expect, it } from "vitest";
import { ERAS, ERA_IDS, eraForYear } from "../src/eras.ts";

describe("eraForYear", () => {
  it.each([
    [-3000, "antiquity"],
    [-430, "antiquity"],
    [499, "antiquity"],
    [500, "medieval"],
    [1449, "medieval"],
    [1450, "print"],
    [1779, "print"],
    [1780, "industrial"],
    [1899, "industrial"],
    [1900, "machine"],
    [1944, "machine"],
    [1945, "atomic"],
    [1969, "atomic"],
    [1970, "analog"],
    [1989, "analog"],
    [1990, "digital"],
    [2026, "digital"],
  ] as const)("puts %i in %s", (year, era) => {
    expect(eraForYear(year).id).toBe(era);
  });

  it("puts a year before the first era in the first era, and after the last in the last", () => {
    expect(eraForYear(-100000).id).toBe("antiquity");
    expect(eraForYear(3000).id).toBe("digital");
  });

  it("puts a fractional year by the whole year it falls in", () => {
    expect(eraForYear(1899.5).id).toBe("industrial");
  });
});

describe("ERAS", () => {
  it("runs in timeline order with no gaps or overlaps", () => {
    expect(ERAS.map((e) => e.id)).toEqual(ERA_IDS);
    for (let i = 1; i < ERAS.length; i++) {
      expect(ERAS[i]?.from).toBe((ERAS[i - 1]?.to ?? NaN) + 1);
    }
  });
});
