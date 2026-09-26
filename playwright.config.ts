// Playwright drives the built site headless, for everything that has to be
// seen or measured: the layout, the pictures, accessibility, the fuzzer and
// performance. It serves the test build, which is the real site plus
// window.__pw, so a test sets the scroll position rather than waiting on one.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4400;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: true,
  reporter: [["list"]],
  snapshotPathTemplate: "e2e/pictures/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0, threshold: 0.1, animations: "disabled", caret: "hide" },
  },
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Serves the test build that npm run build:test wrote. See scripts/serve.ts for why not astro preview.
    command: `node --import tsx scripts/serve.ts dist-test ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
});
