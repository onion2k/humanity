// Reads design-system/tokens.json into one plain shape that the CSS generator
// and the contrast gate both use. Without it, each would read the file its own
// way and could disagree about which colour an era has.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isEraId, type EraId } from "../eras.ts";

export const TOKENS_PATH = fileURLToPath(new URL("../../design-system/tokens.json", import.meta.url));

interface NamedValue {
  name: string;
  value: string;
}

interface TypeStyle {
  name: string;
  family?: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

interface TokensFile {
  color: {
    themes: { id: string; name: string }[];
    tokens: { name: string; value: string | Record<string, string> }[];
  };
  type: {
    families: Record<string, string>;
    groups: { name: string; styles: TypeStyle[] }[];
  };
  spacing: { tokens: NamedValue[] };
  radius: { tokens: NamedValue[] };
  duration: { tokens: NamedValue[] };
  easing: { tokens: NamedValue[] };
}

export interface Tokens {
  eras: EraId[];
  /** Colours that change per era. An alias such as "{ink}" is kept as written. */
  colours: Record<string, Partial<Record<EraId, string>>>;
  /** Colours that stay the same in every era, such as the minimap's era swatches. */
  constants: Record<string, string>;
  families: Record<string, string>;
  typeStyles: TypeStyle[];
  spacing: NamedValue[];
  radius: NamedValue[];
  duration: NamedValue[];
  easing: NamedValue[];
}

/** Parses tokens.json, failing loudly on a theme that is not a known era. */
export function parseTokens(file: TokensFile): Tokens {
  const eras = file.color.themes.map((t) => {
    if (!isEraId(t.id)) throw new Error(`tokens.json has a theme "${t.id}" that is not an era`);
    return t.id;
  });
  const colours: Tokens["colours"] = {};
  const constants: Tokens["constants"] = {};
  for (const token of file.color.tokens) {
    if (typeof token.value === "string" && !isAlias(token.value)) {
      constants[token.name] = token.value;
    } else if (typeof token.value === "string") {
      const alias = token.value;
      colours[token.name] = Object.fromEntries(eras.map((era) => [era, alias]));
    } else {
      colours[token.name] = { ...token.value };
    }
  }
  return {
    eras,
    colours,
    constants,
    families: file.type.families,
    typeStyles: file.type.groups.flatMap((g) => g.styles),
    spacing: file.spacing.tokens,
    radius: file.radius.tokens,
    duration: file.duration.tokens,
    easing: file.easing.tokens,
  };
}

export function loadTokens(path = TOKENS_PATH): Tokens {
  return parseTokens(JSON.parse(readFileSync(path, "utf8")) as TokensFile);
}

/** True for a value like "{ink}" that names another token. */
export function isAlias(value: string): boolean {
  return /^\{[a-z0-9-]+\}$/.test(value);
}

export function aliasTarget(value: string): string {
  return value.slice(1, -1);
}

/** The colour tokens that take a different value in each era. */
export function themedColourNames(tokens: Tokens): string[] {
  return Object.keys(tokens.colours);
}

/** The literal colour a token has in an era, following aliases. */
export function resolveColour(tokens: Tokens, name: string, era: EraId, seen: string[] = []): string {
  const value = tokens.colours[name]?.[era] ?? tokens.constants[name];
  if (value === undefined) throw new Error(`No colour "${name}" in ${era}`);
  if (!isAlias(value)) return value;
  if (seen.includes(name)) throw new Error(`Alias loop: ${[...seen, name].join(" → ")}`);
  return resolveColour(tokens, aliasTarget(value), era, [...seen, name]);
}
