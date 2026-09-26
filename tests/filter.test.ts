// The filter rules, headless: which events a filter leaves undimmed, how a
// filter is written into the address and read back, and what the count says.
// The page only ticks boxes and dims what these say, so if they hold, every
// filter a reader can set dims exactly the right events.
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTER,
  countLabel,
  filterFromQuery,
  filterToQuery,
  isEmpty,
  matches,
  type Facets,
  type Filter,
} from "../src/engine/filter.ts";
import { loadTimeline } from "../src/data/load.ts";
import { seeded } from "../src/random.ts";

const event: Facets = { reactions: ["panic", "humour"], regions: ["europe"], themes: ["comets", "prophecy"] };
const filter = (f: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...f });

describe("matches", () => {
  it("matches everything when nothing is ticked", () => {
    expect(matches(event, EMPTY_FILTER)).toBe(true);
    expect(isEmpty(EMPTY_FILTER)).toBe(true);
  });

  it("matches any ticked option within a group, on any of the event's values, not just its main one", () => {
    expect(matches(event, filter({ reactions: ["humour"] }))).toBe(true);
    expect(matches(event, filter({ reactions: ["wonder", "panic"] }))).toBe(true);
    expect(matches(event, filter({ reactions: ["wonder"] }))).toBe(false);
  });

  it("needs every group that has something ticked", () => {
    expect(matches(event, filter({ reactions: ["panic"], regions: ["europe"] }))).toBe(true);
    expect(matches(event, filter({ reactions: ["panic"], regions: ["asia"] }))).toBe(false);
    expect(matches(event, filter({ themes: ["prophecy"], regions: ["asia", "europe"] }))).toBe(true);
  });

  it("agrees with the rule written out plainly, on seeded random events and filters", () => {
    const random = seeded(21);
    const pool = { reactions: ["a", "b", "c", "d"], regions: ["r", "s", "t"], themes: ["x", "y", "z", "w"] };
    const some = (values: string[], most: number): string[] =>
      values.filter(() => random.next() < most / values.length);
    for (let run = 0; run < 5000; run++) {
      const e: Facets = {
        reactions: some(pool.reactions, 1.5),
        regions: some(pool.regions, 1.2),
        themes: some(pool.themes, 1.5),
      };
      const f: Filter = {
        reactions: some(pool.reactions, 1),
        regions: some(pool.regions, 1),
        themes: some(pool.themes, 1),
      };
      const plain = (["reactions", "regions", "themes"] as const).every(
        (group) => f[group].length === 0 || f[group].some((value) => e[group].includes(value)),
      );
      expect(matches(e, f)).toBe(plain);
    }
  });
});

describe("the address", () => {
  const known = {
    reactions: ["panic", "credible-concern", "wonder"],
    regions: ["europe", "asia"],
    themes: ["comets", "prophecy"],
  };

  it("writes nothing for an empty filter, so the plain address stays plain", () => {
    expect(filterToQuery(EMPTY_FILTER)).toBe("");
  });

  it("writes each ticked group once, its values joined by commas", () => {
    expect(filterToQuery(filter({ reactions: ["panic", "wonder"], themes: ["comets"] }))).toBe(
      "?reaction=panic,wonder&theme=comets",
    );
  });

  it("reads back what it writes", () => {
    const f = filter({ reactions: ["credible-concern"], regions: ["asia", "europe"], themes: ["prophecy"] });
    expect(filterFromQuery(filterToQuery(f), known)).toEqual(f);
  });

  it("ignores values it does not know, repeats and other parameters, so an old or hand-typed link still opens", () => {
    expect(filterFromQuery("?reaction=panic,glee,panic&region=mars&utm_source=x&theme=", known)).toEqual(
      filter({ reactions: ["panic"] }),
    );
  });

  it("reads an empty or missing query as no filter", () => {
    expect(filterFromQuery("", known)).toEqual(EMPTY_FILTER);
    expect(filterFromQuery("?", known)).toEqual(EMPTY_FILTER);
  });
});

describe("countLabel", () => {
  it("says every event shows when nothing is ticked", () => {
    expect(countLabel(386, 386, true)).toBe("Showing all 386 events");
  });

  it("says how many match when a filter is set", () => {
    expect(countLabel(23, 386, false)).toBe("23 of 386 events match");
    expect(countLabel(1, 386, false)).toBe("1 of 386 events matches");
  });

  it("says plainly when nothing matches, and how to get the events back", () => {
    expect(countLabel(0, 386, false)).toBe("No events match. Clear the filters to see them all again.");
  });
});

describe("the real data", () => {
  it("has a value in every group for every event, so no event can only ever be dimmed", () => {
    for (const e of loadTimeline().events) {
      expect(e.reactions.length, e.id).toBeGreaterThan(0);
      expect(e.regions.length, e.id).toBeGreaterThan(0);
      expect(e.themes.length, e.id).toBeGreaterThan(0);
    }
  });
});
