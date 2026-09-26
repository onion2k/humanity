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
