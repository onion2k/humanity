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

export interface Reaction {
  /** The export's own word for it, shown beside the mark. */
  label: string;
  /** The colour token that fills the mark. It changes per era and only reinforces the shape. */
  token: string;
  /** A solid silhouette on a 20×20 grid. */
  path: string;
}

/** The first four shapes are the brand book's. The last four were drawn for the export's new reactions. */
export const REACTIONS: Record<ReactionId, Reaction> = {
  panic: {
    label: "Panic",
    token: "react-panic",
    path: "M10 0l2.2 5.6L18 3.4l-2.6 5.2L20 11l-5.8 1.3 1.6 6.1-5.8-3.3L4.2 18.4l1.6-6.1L0 11l4.6-2.4L2 3.4l5.8 2.2z",
  },
  "credible-concern": { label: "Credible concern", token: "react-concern", path: "M10 1.5L19.5 18.5H0.5z" },
  wonder: {
    label: "Wonder",
    token: "react-wonder",
    path: "M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z",
  },
  optimism: { label: "Optimism", token: "react-hope", path: "M1 16a9 9 0 0 1 18 0zM0 17.5h20V20H0z" },
  // Two linked rings: people meeting a thing together.
  cooperation: {
    label: "Cooperation",
    token: "react-cooperation",
    // Each ring's hole winds the other way, so where one ring crosses the other's hole it stays solid.
    path: "M6.5 3.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM6.5 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM13.5 3.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM13.5 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z",
  },
  // A raised glass.
  celebration: {
    label: "Celebration",
    token: "react-celebration",
    path: "M3 1H17C17 5.5 14.5 8.4 11 9V15H15V18H5V15H9V9C5.5 8.4 3 5.5 3 1z",
  },
  // A grin, without the face that would make it an emoji.
  humour: { label: "Humour", token: "react-humour", path: "M1 6a9 9 0 0 0 18 0a12 12 0 0 1-18 0z" },
  // A flat bar: the line that does not move.
  complacency: {
    label: "Complacency",
    token: "react-complacency",
    path: "M5 6h10a4 4 0 0 1 0 8H5a4 4 0 0 1 0-8z",
  },
};

export const VERDICT_IDS = ["vindicated", "overblown", "mixed", "open"] as const;

export type VerdictId = (typeof VERDICT_IDS)[number];

/** The stamp's words. "Still out" is used rather than guessing. */
export const VERDICT_LABELS: Record<VerdictId, string> = {
  vindicated: "Vindicated",
  overblown: "Overblown",
  mixed: "Mixed",
  open: "Still out",
};
