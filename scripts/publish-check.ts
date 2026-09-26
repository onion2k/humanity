// The check before publishing. The build lets warnings through so work can go
// on while sources are still being gathered; this does not. Every event needs
// sources and a title without a year before the site goes public.
import { assertPublishable, loadTimeline } from "../src/data/load.ts";

try {
  assertPublishable(loadTimeline());
  console.log("Ready to publish: no issues in the event data.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
