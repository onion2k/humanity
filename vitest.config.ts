// Vitest runs the headless unit tests in tests/. The browser tests in e2e/
// belong to Playwright, and Vitest would otherwise pick up their .spec files.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
