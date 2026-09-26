/** The eight era skins, in timeline order. Each id is also a theme id (data-theme). */
export type EraId = "antiquity" | "medieval" | "print" | "industrial" | "machine" | "atomic" | "analog" | "digital";
/** How people reacted. Always shown as shape + word, never colour alone. */
export type Reaction = "panic" | "concern" | "wonder" | "hope";
/** Hindsight verdict on the reaction. */
export type Verdict = "vindicated" | "overblown" | "mixed" | "open";
export interface TimelineEvent {
  /** Negative for BC. */ year: number;
  title: string;
  /** One or two sentences, plain and factual. */ body: string;
  reaction: Reaction;
  /** Region first, then recurring theme, e.g. ["Europe", "Prophecy"]. */ tags?: string[];
  verdict?: Verdict;
}
/** Returns the HTML string for one event card, styled by the era theme on an ancestor. */
export function EventCard(event: TimelineEvent): string;
/** Returns the HTML string for one compact, expandable event row (a <details> element) on the spine. */
export function EventRow(event: TimelineEvent): string;
/** Returns the HTML string for a reaction mark plus its label. */
export function ReactionMark(reaction: Reaction): string;
/** The era a year falls in; use its id as data-theme. */
export function eraForYear(year: number): { id: EraId; name: string; from: number; to: number };
