// The eight eras, in timeline order. Each id is also a colour theme in
// tokens.json and the value of data-theme on the page. Everything that walks
// the eras reads this list, so an era added here and missed in tokens.json
// fails the token tests instead of rendering in the wrong colours.

export const ERA_IDS = [
  "antiquity",
  "medieval",
  "print",
  "industrial",
  "machine",
  "atomic",
  "analog",
  "digital",
] as const;

export type EraId = (typeof ERA_IDS)[number];

export function isEraId(value: string): value is EraId {
  return (ERA_IDS as readonly string[]).includes(value);
}

export interface Era {
  id: EraId;
  name: string;
  /** First year of the era, inclusive. Negative for BC. */
  from: number;
  /** Last year of the era, inclusive. */
  to: number;
}

/** The brand book's spans. The first and last eras also take any year beyond them. */
export const ERAS: readonly Era[] = [
  { id: "antiquity", name: "Antiquity", from: -3000, to: 499 },
  { id: "medieval", name: "Medieval", from: 500, to: 1449 },
  { id: "print", name: "Print Age", from: 1450, to: 1779 },
  { id: "industrial", name: "Industrial", from: 1780, to: 1899 },
  { id: "machine", name: "Machine Age", from: 1900, to: 1944 },
  { id: "atomic", name: "Atomic", from: 1945, to: 1969 },
  { id: "analog", name: "Analog", from: 1970, to: 1989 },
  { id: "digital", name: "Digital", from: 1990, to: 9999 },
];

/** The era a year falls in. Its id is the data-theme for anything from that year. */
export function eraForYear(year: number): Era {
  const whole = Math.floor(year);
  const era = ERAS.find((e) => whole <= e.to) ?? ERAS[ERAS.length - 1];
  if (!era) throw new Error("ERAS is empty");
  return era;
}
