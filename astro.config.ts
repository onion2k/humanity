// One static site, with the tokens written and the event data checked before anything reads them.
import { defineConfig } from "astro/config";
import data from "./integrations/data.ts";
import tokens from "./integrations/tokens.ts";

export default defineConfig({
  output: "static",
  integrations: [tokens(), data()],
});
