// Which events a filter leaves undimmed, and how a filter is kept in the
// address so a filtered view can be shared. Within a group any ticked option
// will do; across groups, every group with something ticked must match. An
// event matches on any of its values, not only its main one.

export interface Facets {
  reactions: readonly string[];
  regions: readonly string[];
  themes: readonly string[];
}

export interface Filter {
  reactions: string[];
  regions: string[];
  themes: string[];
}

export const EMPTY_FILTER: Filter = { reactions: [], regions: [], themes: [] };

const GROUPS = ["reactions", "regions", "themes"] as const;
/** The singular names used in the address: ?reaction=panic&region=europe. */
const PARAMS: Record<(typeof GROUPS)[number], string> = {
  reactions: "reaction",
  regions: "region",
  themes: "theme",
};

export function isEmpty(filter: Filter): boolean {
  return GROUPS.every((group) => filter[group].length === 0);
}

export function matches(facets: Facets, filter: Filter): boolean {
  return GROUPS.every(
    (group) => filter[group].length === 0 || filter[group].some((value) => facets[group].includes(value)),
  );
}

export function filterToQuery(filter: Filter): string {
  const parts = GROUPS.filter((group) => filter[group].length > 0).map(
    (group) => `${PARAMS[group]}=${filter[group].map(encodeURIComponent).join(",")}`,
  );
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** Reads a filter back from the address, keeping only values the page knows, once each. */
export function filterFromQuery(
  search: string,
  known: Record<(typeof GROUPS)[number], readonly string[]>,
): Filter {
  const params = new URLSearchParams(search);
  const read = (group: (typeof GROUPS)[number]): string[] => {
    const values = (params.get(PARAMS[group]) ?? "").split(",").map((v) => v.trim());
    return [...new Set(values)].filter((value) => known[group].includes(value));
  };
  return { reactions: read("reactions"), regions: read("regions"), themes: read("themes") };
}

export function countLabel(matching: number, total: number, empty: boolean): string {
  if (empty) return `Showing all ${total} events`;
  if (matching === 0) return "No events match. Clear the filters to see them all again.";
  return `${matching} of ${total} events ${matching === 1 ? "matches" : "match"}`;
}
