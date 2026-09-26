// Holds the timeline to the export and the editorial overlay. The page trusts
// what buildTimeline hands it, so every event must come through exactly once,
// in order, in the right era, with every mistake in the data named rather than
// dropped or guessed at.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ERA_IDS } from "../src/eras.ts";
import { REACTION_IDS } from "../src/reactions.ts";
import { buildTimeline, type Issue } from "../src/data/timeline.ts";
import { pageTimeline } from "../src/data/page.ts";
import {
  EDITORIAL_PATH,
  EXPORT_PATH,
  assertNoErrors,
  assertPublishable,
  loadTimeline,
} from "../src/data/load.ts";

const realExport = JSON.parse(readFileSync(EXPORT_PATH, "utf8")) as {
  events: Record<string, unknown>[];
  eventCount: number;
};

/** A raw event in the export's shape, with overrides. */
function rawEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const id = typeof overrides.id === "string" ? overrides.id : "1910-comet-pills";
  return {
    id,
    era: "Before 1940",
    date: "1910",
    year: { start: 1910, end: 1910, approximate: false, openEnded: false },
    title: "Comet pills",
    titleMarkdown: "Comet pills",
    kind: "Natural",
    reactions: ["Panic"],
    regions: ["North America"],
    themes: ["Comets & asteroids"],
    description: "Some people bought pills against comet gas.",
    descriptionMarkdown: "Some people bought pills against comet gas.",
    source: "https://en.wikipedia.org/wiki/Halley%27s_Comet",
    ...overrides,
  };
}

/** The real export's vocabularies around the given events. */
function rawExport(events: Record<string, unknown>[]): Record<string, unknown> {
  return { ...realExport, events, eventCount: events.length };
}

function codes(issues: Issue[]): string[] {
  return issues.map((i) => `${i.level}:${i.code}${i.id ? `:${i.id}` : ""}`);
}

describe("the real export", () => {
  const result = loadTimeline();

  it("builds with no errors", () => {
    expect(result.issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("brings every event through exactly once", () => {
    expect(result.events).toHaveLength(realExport.eventCount);
    expect(new Set(result.events.map((e) => e.id))).toEqual(new Set(realExport.events.map((e) => e.id)));
  });

  it("runs in order of start year", () => {
    const starts = result.events.map((e) => e.year.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("gives every era at least one event, and every event a known reaction", () => {
    expect(new Set(result.events.map((e) => e.era))).toEqual(new Set(ERA_IDS));
    for (const e of result.events) {
      expect(e.reactions.length).toBeGreaterThan(0);
      for (const r of e.reactions) expect(REACTION_IDS).toContain(r);
    }
  });

  it("features about one event in six, with at least one card and a mix of reactions in every era", () => {
    const featured = result.events.filter((e) => e.featured);
    const share = featured.length / result.events.length;
    expect(share).toBeGreaterThanOrEqual(0.14);
    expect(share).toBeLessThanOrEqual(0.2);
    for (const era of ERA_IDS) {
      const cards = featured.filter((e) => e.era === era);
      expect(cards.length, era).toBeGreaterThanOrEqual(1);
      if (cards.length >= 3) {
        expect(new Set(cards.map((e) => e.reactions[0])).size, era).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("warns about the events that still lack sources, and about nothing unexpected", () => {
    const warnings = result.issues.filter((i) => i.level === "warning");
    expect(new Set(warnings.map((w) => w.code))).toEqual(new Set(["no-sources", "year-in-title"]));
  });
});

describe("buildTimeline", () => {
  it("maps the export's labels to vocabulary ids and derives the era from the start year", () => {
    const { events, issues } = buildTimeline(
      rawExport([rawEvent({ reactions: ["Credible concern", "Panic"] })]),
      {},
    );
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(events[0]).toMatchObject({
      id: "1910-comet-pills",
      era: "machine",
      date: "1910",
      kind: "natural",
      reactions: ["credible-concern", "panic"],
      regions: ["north-america"],
      themes: ["comets-and-asteroids"],
      featured: false,
      sources: ["https://en.wikipedia.org/wiki/Halley%27s_Comet"],
    });
    expect(events[0]?.verdict).toBeUndefined();
  });

  it("renders the markdown title and body", () => {
    const { events } = buildTimeline(
      rawExport([
        rawEvent({
          title: "Titanic",
          titleMarkdown: "*Titanic*",
          description: "A film about Titanic.",
          descriptionMarkdown: "A film about *Titanic*.",
        }),
      ]),
      {},
    );
    expect(events[0]).toMatchObject({
      title: "Titanic",
      titleHtml: "<em>Titanic</em>",
      body: "A film about Titanic.",
      bodyHtml: "A film about <em>Titanic</em>.",
    });
  });

  it("keeps the export's order among events that start in the same year", () => {
    const { events } = buildTimeline(
      rawExport([
        rawEvent({ id: "b", year: { start: 1910, end: 1910, approximate: false, openEnded: false } }),
        rawEvent({ id: "c", year: { start: 1800, end: 1800, approximate: false, openEnded: false } }),
        rawEvent({ id: "a", year: { start: 1910, end: 1910, approximate: false, openEnded: false } }),
      ]),
      {},
    );
    expect(events.map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("accepts an open-ended date with no end year", () => {
    const { events, issues } = buildTimeline(
      rawExport([
        rawEvent({
          date: "541 onwards",
          year: { start: 541, end: null, approximate: false, openEnded: true },
        }),
      ]),
      {},
    );
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(events[0]?.era).toBe("medieval");
  });

  it.each([
    ["a duplicate id", [rawEvent(), rawEvent()], "error:duplicate-id:1910-comet-pills"],
    ["an unknown reaction", [rawEvent({ reactions: ["Glee"] })], "error:unknown-reaction:1910-comet-pills"],
    ["an unknown region", [rawEvent({ regions: ["Atlantis"] })], "error:unknown-region:1910-comet-pills"],
    ["an unknown theme", [rawEvent({ themes: ["Dragons"] })], "error:unknown-theme:1910-comet-pills"],
    ["an unknown kind", [rawEvent({ kind: "Magic" })], "error:unknown-kind:1910-comet-pills"],
    ["no reactions", [rawEvent({ reactions: [] })], "error:schema"],
    [
      "an end before the start",
      [rawEvent({ year: { start: 1910, end: 1900, approximate: false, openEnded: false } })],
      "error:year-range:1910-comet-pills",
    ],
    [
      "unsupported markdown",
      [rawEvent({ descriptionMarkdown: "Some **bold**." })],
      "error:markdown:1910-comet-pills",
    ],
    [
      "markdown that says something else than the plain text",
      [rawEvent({ titleMarkdown: "Comet *tablets*" })],
      "error:markdown-mismatch:1910-comet-pills",
    ],
    ["a source that is not a web address", [rawEvent({ source: "a book" })], "error:schema"],
  ])("reports %s as an error", (_, events, code) => {
    const { issues } = buildTimeline(rawExport(events), {});
    expect(codes(issues)).toContain(code);
  });

  it("reports a vocabulary reaction that has no shape yet, because a reaction needs a shape before it can be shown", () => {
    const raw = rawExport([rawEvent()]) as { vocabularies: { reactions: unknown[] } };
    raw.vocabularies = {
      ...raw.vocabularies,
      reactions: [...raw.vocabularies.reactions, { id: "denial", label: "Denial", description: "" }],
    };
    expect(codes(buildTimeline(raw, {}).issues)).toContain("error:reaction-without-shape");
  });

  it("reports an event count that does not match the events", () => {
    const raw = { ...rawExport([rawEvent()]), eventCount: 2 };
    expect(codes(buildTimeline(raw, {}).issues)).toContain("error:count-mismatch");
  });

  it("reports a file that is not an export at all, without throwing", () => {
    expect(codes(buildTimeline({ nope: true }, {}).issues)).toContain("error:schema");
  });
});

describe("the editorial overlay", () => {
  const one = rawExport([rawEvent({ source: null })]);

  it("marks featured events", () => {
    const { events } = buildTimeline(one, { featured: ["1910-comet-pills"] });
    expect(events[0]?.featured).toBe(true);
  });

  it("adds a verdict, sources and copy fixes", () => {
    const { events } = buildTimeline(one, {
      events: {
        "1910-comet-pills": {
          verdict: "overblown",
          sources: ["https://example.org/a", "https://example.org/a", "https://example.org/b"],
          title: "Pills against a *comet*",
          body: "Hucksters sold pills.",
        },
      },
    });
    expect(events[0]).toMatchObject({
      verdict: "overblown",
      sources: ["https://example.org/a", "https://example.org/b"],
      title: "Pills against a comet",
      titleHtml: "Pills against a <em>comet</em>",
      body: "Hucksters sold pills.",
    });
  });

  it("puts the export's source first and drops a repeat of it", () => {
    const { events } = buildTimeline(rawExport([rawEvent()]), {
      events: {
        "1910-comet-pills": {
          sources: ["https://example.org/b", "https://en.wikipedia.org/wiki/Halley%27s_Comet"],
        },
      },
    });
    expect(events[0]?.sources).toEqual([
      "https://en.wikipedia.org/wiki/Halley%27s_Comet",
      "https://example.org/b",
    ]);
  });

  it.each([
    ["a featured id not in the export", { featured: ["gone"] }, "error:editorial-unknown-id:gone"],
    [
      "an event id not in the export",
      { events: { gone: { verdict: "mixed" } } },
      "error:editorial-unknown-id:gone",
    ],
    [
      "a featured id listed twice",
      { featured: ["1910-comet-pills", "1910-comet-pills"] },
      "error:editorial-duplicate:1910-comet-pills",
    ],
    [
      "a verdict that does not exist",
      { events: { "1910-comet-pills": { verdict: "maybe" } } },
      "error:schema",
    ],
    ["a field it does not know", { events: { "1910-comet-pills": { featured: true } } }, "error:schema"],
  ])("reports %s as an error", (_, editorial, code) => {
    expect(codes(buildTimeline(one, editorial).issues)).toContain(code);
  });
});

describe("the publish warnings", () => {
  it("warns about an event with no sources", () => {
    const { issues } = buildTimeline(rawExport([rawEvent({ source: null })]), {});
    expect(codes(issues)).toEqual(["warning:no-sources:1910-comet-pills"]);
  });

  it("is quiet once the overlay supplies a source", () => {
    const { issues } = buildTimeline(rawExport([rawEvent({ source: null })]), {
      events: { "1910-comet-pills": { sources: ["https://example.org"] } },
    });
    expect(issues).toEqual([]);
  });

  it.each(["Comet of 1857", "November 1882 solar storm", "1889–1890 pandemic", "Eclipse of 585 BC"])(
    "warns about a year in the title %j",
    (title) => {
      const { issues } = buildTimeline(rawExport([rawEvent({ title, titleMarkdown: title })]), {});
      expect(codes(issues)).toContain("warning:year-in-title:1910-comet-pills");
    },
  );

  it.each(["Unit 731 germ attacks", "Goldsboro B-52 crash", "K-19 submarine accident"])(
    "does not mistake a number for a year in %j",
    (title) => {
      const { issues } = buildTimeline(rawExport([rawEvent({ title, titleMarkdown: title })]), {});
      expect(issues).toEqual([]);
    },
  );

  it("does not count a year inside the italic name of a work", () => {
    const { issues } = buildTimeline(
      rawExport([rawEvent({ title: "2001: A Space Odyssey", titleMarkdown: "*2001: A Space Odyssey*" })]),
      {},
    );
    expect(issues).toEqual([]);
  });

  it("lets the overlay allow a year that is part of a name, with a reason", () => {
    const title = "Asteroid 2024 YR4";
    const { issues } = buildTimeline(rawExport([rawEvent({ title, titleMarkdown: title })]), {
      events: { "1910-comet-pills": { allowYearInTitle: "The year is part of the asteroid's designation." } },
    });
    expect(issues).toEqual([]);
  });
});

describe("the paths", () => {
  it("point at the real files", () => {
    expect(EXPORT_PATH).toMatch(/data\/panic-and-wonder\.json$/);
    expect(EDITORIAL_PATH).toMatch(/data\/editorial\.json$/);
  });
});

describe("the gates on the data", () => {
  const broken = buildTimeline(
    rawExport([rawEvent({ reactions: ["Glee"] }), rawEvent({ id: "b", source: null })]),
    {},
  );

  it("lets the build through with warnings but stops it on an error, naming each one", () => {
    expect(() => {
      assertNoErrors(buildTimeline(rawExport([rawEvent({ source: null })]), {}));
    }).not.toThrow();
    expect(() => {
      assertNoErrors(broken);
    }).toThrow(/1 error:\n {2}error unknown-reaction 1910-comet-pills: "Glee"/);
  });

  it("stops publishing on warnings as well as errors", () => {
    expect(() => {
      assertPublishable(buildTimeline(rawExport([rawEvent()]), {}));
    }).not.toThrow();
    expect(() => {
      assertPublishable(buildTimeline(rawExport([rawEvent({ source: null })]), {}));
    }).toThrow(/1 issue:\n {2}warning no-sources 1910-comet-pills/);
    expect(() => {
      assertPublishable(broken);
    }).toThrow(/2 issues[\s\S]*unknown-reaction[\s\S]*no-sources b/);
  });
});

describe("the page's copy of the timeline", () => {
  it("is the same timeline the build checked", () => {
    expect(pageTimeline()).toEqual(loadTimeline());
  });
});
