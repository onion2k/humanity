// The reactions the site can show. Each needs its own shape before it can
// appear, so this list is closed: a reaction that turns up in the data but not
// here stops the build, rather than rendering as a word with no mark.

export const REACTION_IDS = [
  "panic",
  "credible-concern",
  "wonder",
  "optimism",
  "cooperation",
  "celebration",
  "humour",
  "complacency",
] as const;

export type ReactionId = (typeof REACTION_IDS)[number];

export function isReactionId(value: string): value is ReactionId {
  return (REACTION_IDS as readonly string[]).includes(value);
}

export const VERDICT_IDS = ["vindicated", "overblown", "mixed", "open"] as const;

export type VerdictId = (typeof VERDICT_IDS)[number];
