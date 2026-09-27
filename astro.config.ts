// One static site, with the tokens written and the event data checked before anything reads them.
import { defineConfig } from "astro/config";
import data from "./integrations/data.ts";
import testApi from "./integrations/test-api.ts";
import tokens from "./integrations/tokens.ts";

// The test build adds window.__pw for Playwright, so it goes to its own folder and never ships.
const testBuild = process.env.PUBLIC_TEST_API === "1";

export default defineConfig({
  output: "static",
  outDir: testBuild ? "./dist-test" : "./dist",
  integrations: [tokens(), data(), testApi({ enabled: testBuild })],
});
