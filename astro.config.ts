// One static site, with the tokens written before anything reads them.
import { defineConfig } from "astro/config";
import tokens from "./integrations/tokens.ts";

export default defineConfig({
  output: "static",
  integrations: [tokens()],
});
