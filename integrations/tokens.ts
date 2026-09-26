// Writes src/styles/tokens.css from design-system/tokens.json whenever Astro
// starts or builds, and restarts the dev server when the tokens change. A build
// stops if any text pair fails its contrast ratio in any era. Without it, the
// page would run on a stale copy of the palette that the contrast gate never saw.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { assertContrast } from "../src/tokens/contrast.ts";
import { tokensToCss } from "../src/tokens/css.ts";
import { TOKENS_PATH, loadTokens } from "../src/tokens/tokens.ts";

export const TOKENS_CSS_PATH = fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url));

/** Writes tokens.css, touching the file only when its contents change so Vite does not reload for nothing. */
export function writeTokensCss(tokens = loadTokens()): boolean {
  const css = tokensToCss(tokens);
  let current = "";
  try {
    current = readFileSync(TOKENS_CSS_PATH, "utf8");
  } catch {
    // No file yet: this is the first run.
  }
  if (current === css) return false;
  mkdirSync(dirname(TOKENS_CSS_PATH), { recursive: true });
  writeFileSync(TOKENS_CSS_PATH, css);
  return true;
}

export default function tokens(): AstroIntegration {
  return {
    name: "panic-wonder-tokens",
    hooks: {
      "astro:config:setup": ({ addWatchFile, command, logger }) => {
        const loaded = loadTokens();
        try {
          assertContrast(loaded);
        } catch (error) {
          // The dev server keeps running so the palette can be fixed while looking at it.
          if (command === "build") throw error;
          logger.warn(String(error));
        }
        if (writeTokensCss(loaded)) logger.info("wrote src/styles/tokens.css");
        addWatchFile(TOKENS_PATH);
      },
    },
  };
}
