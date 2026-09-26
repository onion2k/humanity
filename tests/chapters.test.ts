// Holds the page's plan of the timeline to the rules the brand book sets for
// it: every event once, in its era's chapter, cards alternating either side
// of the spine, tags region first and never more than three. The page only
// draws what this plan says, so a mistake here would reach every reader.
import { describe, expect, it } from "vitest";
import { ERAS, ERA_IDS } from "../src/eras.ts";
import { loadTimeline } from "../src/data/load.ts";
import type { TimelineEvent, Vocabularies } from "../src/data/timeline.ts";
import { chapters, eraSpan, reactionsOf, rowMeta, tagsOf } from "../src/data/chapters.ts";

const timeline = loadTimeline();

/** An event already through buildTimeline, with overrides. */
function event(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "comet-pills",
    era: "machine",
    date: "1910",
    year: { start: 1910, end: 1910, approximate: false, openEnded: false },
    title: "Comet pills",
    titleHtml: "Comet pills",
    body: "Some people bought pills against comet gas.",
    bodyHtml: "Some people bought pills against comet gas.",
    kind: "natural",
    reactions: ["panic"],
    regions: ["north-america"],
    themes: ["comets-asteroids"],
    featured: false,
    sources: [],
    ...overrides,
  };
}

const vocabularies: Vocabularies = {
  kinds: [],
  reactions: [],
  regions: [
    { id: "north-america", label: "North America" },
    { id: "europe", label: "Europe" },
  ],
  themes: [
    { id: "comets-asteroids", label: "Comets & asteroids" },
    { id: "prophecy", label: "Prophecy" },
  ],
};

describe("chapters", () => {
  const plan = chapters(timeline.events);

  it("gives every era a chapter, in order", () => {
    expect(plan.map((c) => c.era.id)).toEqual([...ERA_IDS]);
  });

  it("places every event exactly once, in timeline order, in its own era's chapter", () => {
    const placed = plan.flatMap((c) => c.events.map((p) => p.event));
    expect(placed.map((e) => e.id)).toEqual(timeline.events.map((e) => e.id));
    for (const c of plan) for (const p of c.events) expect(p.event.era, p.event.id).toBe(c.era.id);
  });

  it("alternates cards left and right within each chapter, starting on the left", () => {
    for (const c of plan) {
      const sides = c.events.filter((p) => p.event.featured).map((p) => p.side);
      expect(sides, c.era.id).toEqual(sides.map((_, i) => (i % 2 === 0 ? "left" : "right")));
    }
  });

  it("gives rows no side, because a row straddles the spine", () => {
    for (const c of plan)
      for (const p of c.events.filter((q) => !q.event.featured)) expect(p.side).toBeUndefined();
  });

  it("restarts the alternation in each chapter, so every chapter opens on the left", () => {
    const events = [
      event({ id: "a", era: "machine", featured: true }),
      event({ id: "b", era: "atomic", featured: true }),
    ];
    const plan2 = chapters(events);
    expect(plan2.find((c) => c.era.id === "machine")?.events[0]?.side).toBe("left");
    expect(plan2.find((c) => c.era.id === "atomic")?.events[0]?.side).toBe("left");
  });

  it("keeps an era with no events as an empty chapter, so the spine and the seams stay whole", () => {
    const plan2 = chapters([event()]);
    expect(plan2).toHaveLength(ERAS.length);
    expect(plan2.find((c) => c.era.id === "print")?.events).toEqual([]);
  });

  it("counts cards and rows for each chapter, which the page uses to size a chapter before it is drawn", () => {
    for (const c of plan) {
      expect(c.cards + c.rows, c.era.id).toBe(c.events.length);
      expect(c.cards).toBe(c.events.filter((p) => p.event.featured).length);
    }
  });
});

describe("eraSpan", () => {
  it("writes the first era as 'to' its end, the last as running to now, and the rest as a range", () => {
    expect(ERAS.map(eraSpan)).toEqual([
      "to 500",
      "500–1450",
      "1450–1780",
      "1780–1900",
      "1900–1945",
      "1945–1970",
      "1970–1990",
      "1990–now",
    ]);
  });
});

describe("tagsOf", () => {
  it("puts the region first, then the theme, by their labels", () => {
    expect(tagsOf(event(), vocabularies)).toEqual(["North America", "Comets & asteroids"]);
  });

  it("keeps to three tags, dropping themes before regions", () => {
    const e = event({ regions: ["north-america", "europe"], themes: ["comets-asteroids", "prophecy"] });
    expect(tagsOf(e, vocabularies)).toEqual(["North America", "Europe", "Comets & asteroids"]);
  });

  it("keeps at least one theme when there are two regions and a theme", () => {
    const e = event({ regions: ["north-america", "europe"], themes: ["prophecy"] });
    expect(tagsOf(e, vocabularies)).toEqual(["North America", "Europe", "Prophecy"]);
  });

  it("keeps every tag of the real data to three, with a region first", () => {
    const regionLabels = new Set(timeline.vocabularies.regions.map((r) => r.label));
    for (const e of timeline.events) {
      const tags = tagsOf(e, timeline.vocabularies);
      expect(tags.length, e.id).toBeLessThanOrEqual(3);
      expect(regionLabels.has(tags[0] ?? ""), e.id).toBe(true);
    }
  });
});

describe("reactionsOf", () => {
  it("gives every reaction with its word and shape, the main one first", () => {
    const shown = reactionsOf(event({ reactions: ["wonder", "humour"] }));
    expect(shown.map((r) => [r.id, r.label])).toEqual([
      ["wonder", "Wonder"],
      ["humour", "Humour"],
    ]);
  });
});

describe("rowMeta", () => {
  it("writes the main reaction's word and the date exactly as the export does", () => {
    expect(rowMeta(event({ reactions: ["credible-concern", "panic"], date: "c. 370 BC" }))).toBe(
      "Credible concern · c. 370 BC",
    );
  });
});
