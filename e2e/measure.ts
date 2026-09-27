// The performance instrument: what the first load costs and how the scroll
// holds up, measured the same way every time. The gate in performance.spec.ts
// reads these figures; keeping the measuring apart lets it be watched on its
// own before anything is read into what it reports.
import type { CDPSession, Page } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { TEST_API_MARK } from "../integrations/test-api.ts";
import { openTimeline } from "./helpers.ts";

export interface LoadFigures {
  /** Bytes as served, and as they would travel gzipped. */
  htmlBytes: number;
  htmlGzipBytes: number;
  cssBytes: number;
  scriptBytes: number;
  /** Faces fetched before the reader scrolls. */
  fontsOnLoad: number;
  fontBytesOnLoad: number;
  domNodes: number;
  firstContentfulPaintMs: number;
  /** Chrome's own layout and style time up to the page being ready, at 4× CPU slowdown. */
  loadLayoutMs: number;
  loadStyleMs: number;
}

export interface ScrollFigures {
  /** Distinct faces fetched by the time the reader reaches the end. */
  fontsAtEnd: number;
  steps: number;
  /** Chrome's own totals over the whole sweep, at 4× CPU slowdown. */
  layoutMs: number;
  styleMs: number;
  taskMs: number;
  /** The worst single step, from the scroll to the frame after it is drawn. */
  worstStepMs: number;
  /** Frames the browser itself flagged as long (over 50ms). */
  longFrames: number;
}

async function chromeMetrics(cdp: CDPSession): Promise<Record<string, number>> {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

export async function measureLoad(page: Page, cdp: CDPSession): Promise<LoadFigures> {
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const sizes = { html: 0, htmlGzip: 0, css: 0, script: 0, fonts: 0, fontBytes: 0 };
  const pending: Promise<void>[] = [];
  page.on("response", (response) => {
    const type = response.request().resourceType();
    pending.push(
      response
        .body()
        .then((body) => {
          if (type === "document") {
            sizes.html += body.length;
            sizes.htmlGzip += gzipSync(body).length;
          } else if (type === "stylesheet") sizes.css += body.length;
          // The test API is loaded only in the test build and never ships, so it is left out.
          else if (type === "script" && !body.toString("utf8").includes(TEST_API_MARK))
            sizes.script += body.length;
          else if (type === "font") {
            sizes.fonts += 1;
            sizes.fontBytes += body.length;
          }
        })
        .catch(() => undefined),
    );
  });
  await openTimeline(page);
  const metrics = await chromeMetrics(cdp);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await Promise.all(pending);
  const inPage = await page.evaluate(() => ({
    domNodes: document.getElementsByTagName("*").length,
    fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1,
  }));
  return {
    htmlBytes: sizes.html,
    htmlGzipBytes: sizes.htmlGzip,
    cssBytes: sizes.css,
    scriptBytes: sizes.script,
    fontsOnLoad: sizes.fonts,
    fontBytesOnLoad: sizes.fontBytes,
    domNodes: inPage.domNodes,
    firstContentfulPaintMs: Math.round(inPage.fcp),
    loadLayoutMs: Math.round((metrics.LayoutDuration ?? 0) * 1000),
    loadStyleMs: Math.round((metrics.RecalcStyleDuration ?? 0) * 1000),
  };
}

/** Steps down the whole page, half a screen at a time, as a reader scrolling steadily would. */
export async function measureScroll(page: Page, cdp: CDPSession): Promise<ScrollFigures> {
  const fonts = new Set<string>();
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.add(request.url());
  });
  await openTimeline(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const before = await chromeMetrics(cdp);
  const result = await page.evaluate(async () => {
    let long = 0;
    const observer = new PerformanceObserver((list) => {
      long += list.getEntries().length;
    });
    observer.observe({ type: "long-animation-frame", buffered: false });
    const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    let worst = 0;
    let steps = 0;
    const step = Math.round(window.innerHeight / 2);
    for (let y = 0; y <= document.documentElement.scrollHeight - window.innerHeight; y += step) {
      await frame();
      const start = performance.now();
      window.scrollTo({ top: y, behavior: "instant" });
      await frame();
      await frame();
      worst = Math.max(worst, performance.now() - start);
      steps += 1;
    }
    await document.fonts.ready;
    observer.disconnect();
    return { worst, steps, long };
  });
  const after = await chromeMetrics(cdp);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const spent = (name: string): number => Math.round(((after[name] ?? 0) - (before[name] ?? 0)) * 1000);
  return {
    fontsAtEnd: fonts.size,
    steps: result.steps,
    layoutMs: spent("LayoutDuration"),
    styleMs: spent("RecalcStyleDuration"),
    taskMs: spent("TaskDuration"),
    worstStepMs: Math.round(result.worst),
    longFrames: result.long,
  };
}

export interface FilterFigures {
  /** The worst time, at 4× CPU slowdown, to apply a filter: tick the boxes, dim the events, restyle and lay out. */
  filterMs: number;
}

/** Sets four filters in turn, from nothing ticked to a narrow filter and back, as a reader would. */
export async function measureFilter(page: Page, cdp: CDPSession): Promise<FilterFigures> {
  await openTimeline(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const worst = await page.evaluate(async () => {
    const filters = [
      { reactions: ["wonder"], regions: [], themes: [] },
      { reactions: ["wonder", "panic"], regions: ["europe"], themes: [] },
      { reactions: [], regions: [], themes: ["nuclear-weapons"] },
      { reactions: [], regions: [], themes: [] },
    ];
    const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));
    const boxes = [...document.querySelectorAll<HTMLInputElement>('#filter-panel input[type="checkbox"]')];
    const panel = document.querySelector("#filter-panel");
    let most = 0;
    for (const filter of filters) {
      await frame();
      const wanted: Record<string, string[]> = {
        reaction: filter.reactions,
        region: filter.regions,
        theme: filter.themes,
      };
      const start = performance.now();
      for (const box of boxes) box.checked = wanted[box.name]?.includes(box.value) ?? false;
      panel?.dispatchEvent(new Event("change", { bubbles: true }));
      // Reading a size makes the browser restyle and lay out now, so this times the work and not the wait for a frame.
      document.body.getBoundingClientRect();
      most = Math.max(most, performance.now() - start);
    }
    return most;
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return { filterMs: Math.round(worst) };
}
