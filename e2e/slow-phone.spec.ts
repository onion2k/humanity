// The slow-phone gate: the page as a mid-range phone on a poor connection
// gets it, modelled in Chromium the way Lighthouse does. It is not a real
// phone, and it serves files uncompressed, as Chris chose, so it is a worst
// case for size. It holds how soon the reader sees the page, how long it
// takes to load, what it downloads before scrolling, and whether scrolling
// the whole page ever drops a frame for long.
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const BASELINE_PATH = new URL("./baselines/slow-phone.json", import.meta.url);

/** Lighthouse's slow-phone settings: 6× slower CPU, and Slow 4G at 1.6 Mbps down with 150ms round trips. */
const CPU_SLOWDOWN = 6;
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

interface SlowPhone {
  largestPaintMs: number;
  loadMs: number;
  kilobytesBeforeScrolling: number;
  longFramesScrolling: number;
}

const BUDGET: SlowPhone = {
  largestPaintMs: 2500,
  loadMs: 4000,
  kilobytesBeforeScrolling: 600,
  longFramesScrolling: 0,
};

test("a slow phone sees the page soon and scrolls it without a long frame @perf", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "phone", "It models a phone.");
  test.setTimeout(180_000);
  // The test API never ships, so it is kept out of what the reader downloads.
  await page.route("**/TestApi*", (route) => route.abort());
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
  let bytes = 0;
  page.on("response", (response) => {
    response
      .body()
      .then((body) => {
        bytes += body.length;
      })
      .catch(() => undefined);
  });
  await page.addInitScript(() => {
    const w = window as unknown as { largestPaint: number };
    w.largestPaint = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.largestPaint = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const start = Date.now();
  await page.goto("/", { waitUntil: "load" });
  const loadMs = Date.now() - start;
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const kilobytesBeforeScrolling = Math.round(bytes / 1024);
  const scrolled = await page.evaluate(async () => {
    let long = 0;
    new PerformanceObserver((list) => {
      long += list.getEntries().length;
    }).observe({ type: "long-animation-frame" });
    const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    // 120px a frame is a brisk flick, kept up from the top of the page to the end.
    for (let y = 0; y <= document.documentElement.scrollHeight - window.innerHeight; y += 120) {
      window.scrollTo({ top: y, behavior: "instant" });
      await frame();
    }
    await frame();
    return { long, largestPaint: (window as unknown as { largestPaint: number }).largestPaint };
  });
  const figures: SlowPhone = {
    largestPaintMs: Math.round(scrolled.largestPaint),
    loadMs,
    kilobytesBeforeScrolling,
    longFramesScrolling: scrolled.long,
  };
  console.log(`slow phone: ${JSON.stringify(figures)}`);
  await info.attach("slow-phone.json", {
    body: JSON.stringify(figures, null, 2),
    contentType: "application/json",
  });

  if (process.env.UPDATE_PERF_BASELINE === "1") {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(figures, null, 2)}\n`);
    return;
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as SlowPhone;
  const problems: string[] = [];
  for (const name of Object.keys(BUDGET) as (keyof SlowPhone)[]) {
    if (figures[name] > BUDGET[name])
      problems.push(`${name} ${figures[name]} is over its budget of ${BUDGET[name]}`);
  }
  // Timings wobble, so each is held within a factor of two of its baseline, or 250ms at this slowdown.
  for (const name of ["largestPaintMs", "loadMs"] as const) {
    const was = baseline[name];
    if (figures[name] > Math.max(was * 2, was + 250) || figures[name] < Math.min(was / 2, was - 250)) {
      problems.push(`${name} ${figures[name]}ms moved too far from its baseline ${was}ms`);
    }
  }
  if (
    Math.abs(figures.kilobytesBeforeScrolling - baseline.kilobytesBeforeScrolling) >
    baseline.kilobytesBeforeScrolling * 0.02
  ) {
    problems.push(
      `kilobytesBeforeScrolling ${figures.kilobytesBeforeScrolling} moved more than 2% from ${baseline.kilobytesBeforeScrolling}`,
    );
  }
  expect(problems).toEqual([]);
});
