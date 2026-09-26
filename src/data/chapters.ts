// The page's plan of the timeline: one chapter per era, each event placed as
// a card on one side of the spine or as a row across it, with the words each
// shows. It is pure, so the rules the brand book sets for the layout are held
// by unit tests, and the page is left only to draw what this plan says.
import { ERAS, type Era } from "../eras.ts";
import { REACTIONS, type Reaction, type ReactionId } from "../reactions.ts";
import type { TimelineEvent, Vocabularies, VocabularyItem } from "./timeline.ts";

export type Side = "left" | "right";

export interface PlacedEvent {
  event: TimelineEvent;
  /** Which side of the spine a card sits on. A row straddles the spine and has none. */
  side?: Side;
}

export interface Chapter {
  era: Era;
  events: PlacedEvent[];
  cards: number;
  rows: number;
}

/** Every era gets a chapter, even an empty one, so the spine and the seams between eras stay whole. */
export function chapters(events: readonly TimelineEvent[]): Chapter[] {
  return ERAS.map((era) => {
    let cards = 0;
    const placed = events
      .filter((event) => event.era === era.id)
      .map((event): PlacedEvent => {
        if (!event.featured) return { event };
        const side: Side = cards % 2 === 0 ? "left" : "right";
        cards += 1;
        return { event, side };
      });
    return { era, events: placed, cards, rows: placed.length - cards };
  });
}

/** An era's span as the brand book writes it. Each era ends where the next begins. */
export function eraSpan(era: Era): string {
  const index = ERAS.indexOf(era);
  const end = String(era.to + 1);
  if (index === 0) return `to ${end}`;
  if (index === ERAS.length - 1) return `${era.from}–now`;
  return `${era.from}–${end}`;
}

const MAX_TAGS = 3;

function labels(ids: readonly string[], items: readonly VocabularyItem[]): string[] {
  return ids.map((id) => items.find((item) => item.id === id)?.label ?? id);
}

/** Region first, then theme, and never more than three: a theme goes before a region does. */
export function tagsOf(event: TimelineEvent, vocabularies: Vocabularies): string[] {
  const regions = labels(event.regions, vocabularies.regions);
  const themes = labels(event.themes, vocabularies.themes);
  return [...regions, ...themes].slice(0, MAX_TAGS);
}

export interface ShownReaction extends Reaction {
  id: ReactionId;
}

/** Every reaction, the main one first, each with the word and shape that carry it. */
export function reactionsOf(event: TimelineEvent): ShownReaction[] {
  return event.reactions.map((id) => ({ id, ...REACTIONS[id] }));
}

/** A closed row's line left of the spine: the main reaction's word and the date as the export writes it. */
export function rowMeta(event: TimelineEvent): string {
  const [main] = reactionsOf(event);
  return main ? `${main.label} · ${event.date}` : event.date;
}
