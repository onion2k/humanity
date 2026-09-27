// Puts window.__pw on the page in test builds only, and makes sure a
// production build carries no trace of it. As a component, the test API's
// script was bundled into every build, even where the page never loaded it,
// so it was published with the site. Added here as an injected script, it is
// only ever bundled when a test build asks for it.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

/** The name the test API takes on the page, which survives minification. */
export const TEST_API_MARK = "__pw";

/** The files, of those given, that carry the test API. */
export function filesWithTestApi(files: readonly { path: string; text: string }[]): string[] {
  return files.filter((file) => file.text.includes(TEST_API_MARK)).map((file) => file.path);
}

function textFiles(dir: string): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return /\.(html|js|mjs|css|json)$/.test(entry.name) ? [{ path, text: readFileSync(path, "utf8") }] : [];
  });
}

export default function testApi({ enabled }: { enabled: boolean }): AstroIntegration {
  return {
    name: "panic-wonder-test-api",
    hooks: {
      "astro:config:setup": ({ injectScript }) => {
        if (enabled) injectScript("page", 'import "/src/client/install-test-api.ts";');
      },
      "astro:build:done": ({ dir, logger }) => {
        if (enabled) return;
        const out = fileURLToPath(dir);
        const found = filesWithTestApi(textFiles(out)).map((path) => relative(out, path));
        if (found.length > 0) {
          throw new Error(
            `The production build carries the test API (window.${TEST_API_MARK}) in: ${found.join(", ")}`,
          );
        }
        logger.info("no trace of the test API in the build");
      },
    },
  };
}
