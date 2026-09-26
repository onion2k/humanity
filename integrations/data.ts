// Validates the event data whenever Astro starts or builds, and restarts the
// dev server when either data file changes. An error in the data stops the
// build; warnings are counted so they stay visible until publishing, which
// scripts/publish-check.ts gates.
import type { AstroIntegration } from "astro";
import { EDITORIAL_PATH, EXPORT_PATH, assertNoErrors, loadTimeline } from "../src/data/load.ts";

export default function data(): AstroIntegration {
  return {
    name: "panic-wonder-data",
    hooks: {
      "astro:config:setup": ({ addWatchFile, command, logger }) => {
        const timeline = loadTimeline();
        try {
          assertNoErrors(timeline);
        } catch (error) {
          // The dev server keeps running so the data can be fixed while looking at it.
          if (command === "build") throw error;
          logger.error(String(error));
        }
        const warnings = timeline.issues.filter((i) => i.level === "warning");
        const counts = Object.entries(
          warnings.reduce<Record<string, number>>(
            (acc, w) => ({ ...acc, [w.code]: (acc[w.code] ?? 0) + 1 }),
            {},
          ),
        );
        if (counts.length > 0) {
          logger.warn(
            `${timeline.events.length} events; not ready to publish: ${counts.map(([code, n]) => `${n} ${code}`).join(", ")}. Run npm run publish-check for the list.`,
          );
        }
        addWatchFile(EXPORT_PATH);
        addWatchFile(EDITORIAL_PATH);
      },
    },
  };
}
