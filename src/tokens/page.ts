// The tokens as the pages see them. Vite bundles tokens.json into the build,
// as src/data/page.ts does for the events, so no page reads a path that would
// point somewhere else once the site is built.
import tokensText from "../../design-system/tokens.json?raw";
import { parseTokens, type Tokens } from "./tokens.ts";

let tokens: Tokens | undefined;

export function pageTokens(): Tokens {
  tokens ??= parseTokens(JSON.parse(tokensText) as Parameters<typeof parseTokens>[0]);
  return tokens;
}
