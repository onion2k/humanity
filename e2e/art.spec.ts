// The era art: on a wide screen each chapter's margins carry its era's art,
// pinned in view while the reader is in that era, and where there are no
// margins an emblem stands by the chapter's heading instead. It is decoration,
// so it never covers the reading, the chrome or a band, and it is fetched only
// as its chapter comes near.
import { expect, test, type Page } from "@playwright/test";
import { artStrength } from "../src/art.ts";
import { ERA_IDS, type EraId } from "../src/eras.ts";
import { loadTokens, resolveColour } from "../src/tokens/tokens.ts";
import { openTimeline, scrollToBand, scrollToEra, scrollToY, state } from "./helpers.ts";

const tokens = loadTokens();

/** The narrowest window with margins wide enough for art. */
const WIDE = 1200;

function hexOf(rgb: string): string {
  const parts = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  return `#${(parts?.slice(1, 4) ?? []).map((p) => Number(p).toString(16).padStart(2, "0")).join("")}`;
}

/** Scrolls into the middle of an era's chapter, where its art is pinned. */
async function intoChapter(page: Page, era: EraId): Promise<void> {
  await scrollToEra(page, era);
  const middle = await page.locator(`[data-chapter="${era}"]`).evaluate((c) => {
    const box = c.getBoundingClientRect();
    return box.top + window.scrollY + box.height / 2 - window.innerHeight / 2;
  });
  await scrollToY(page, middle);
}

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test.describe("on a wide screen", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < WIDE, "phones have no margins");

  test("every chapter shows its own era's art in both margins, clear of the track", async ({ page }) => {
    for (const era of ERA_IDS) {
      await intoChapter(page, era);
      const { art } = await state(page);
      const track = await page.locator(`[data-chapter="${era}"] .track`).evaluate((t) => {
        const r = t.getBoundingClientRect();
        return { left: r.left, right: r.right };
      });
      const sides = art.filter((a) => a.part !== "emblem");
      expect(sides.map((a) => `${a.era} ${a.part}`).sort(), era).toEqual([`${era} left`, `${era} right`]);
      for (const a of sides) {
        expect(a.rect.right - a.rect.left, `${era} ${a.part} width`).toBeGreaterThan(40);
        if (a.part === "left")
          expect(track.left - a.rect.right, `${era} left gap`).toBeGreaterThanOrEqual(16);
        else expect(a.rect.left - track.right, `${era} right gap`).toBeGreaterThanOrEqual(16);
        expect(a.rect.left, `${era} ${a.part}`).toBeGreaterThanOrEqual(0);
        expect(a.rect.right, `${era} ${a.part}`).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
      }
      expect(
        art.filter((a) => a.part === "emblem"),
        `${era} emblem`,
      ).toEqual([]);
    }
  });

  test("the art stays pinned in view through the whole of a long chapter", async ({ page }) => {
    const era: EraId = "atomic";
    await intoChapter(page, era);
    const first = (await state(page)).art.find((a) => a.part === "left");
    await page.mouse.wheel(0, 1600);
    await page.evaluate(() => window.__pw?.settle());
    const later = (await state(page)).art.find((a) => a.part === "left");
    expect(first?.era).toBe(era);
    expect(later?.era).toBe(era);
    expect(Math.round(later?.rect.top ?? -1)).toBe(Math.round(first?.rect.top ?? -2));
  });

  test("each era's art is drawn in its accent through a mask, at its strength", async ({ page }) => {
    for (const era of ERA_IDS) {
      await intoChapter(page, era);
      const look = await page.locator(`[data-art="${era}"][data-part="left"]`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { mask: s.maskImage, colour: s.backgroundColor, opacity: Number(s.opacity) };
      });
      expect(look.mask, era).toContain(`/art/${era}-left.svg`);
      expect(hexOf(look.colour), era).toBe(resolveColour(tokens, "accent", era));
      expect(look.opacity, era).toBeCloseTo(artStrength(era), 5);
    }
  });

  test("no art reaches into a band, which stays a still blend", async ({ page }) => {
    for (let index = 0; index < ERA_IDS.length - 1; index++) {
      await scrollToBand(page, index, 0.5);
      const touching = await page.locator(`[data-band="${index}"]`).evaluate((band) => {
        const b = band.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLElement>("[data-art]")].flatMap((art) => {
          const a = art.getBoundingClientRect();
          const drawn = a.width > 0 && a.height > 0;
          return drawn && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5 ? [art.dataset.art ?? "?"] : [];
        });
      });
      expect(touching, `band ${index}`).toEqual([]);
    }
  });

  test("the HUD and the Filter button are drawn over the art, never under it", async ({ page }) => {
    for (const era of ERA_IDS) {
      await scrollToEra(page, era);
      // The chapter's end pushes its art up under the chrome as the next band arrives.
      const end = await page
        .locator(`[data-chapter="${era}"]`)
        .evaluate((c) => c.getBoundingClientRect().bottom + window.scrollY - 60);
      await scrollToY(page, end);
      const under = await page.evaluate(() =>
        [".hud", ".filter-toggle"].flatMap((selector) => {
          const chrome = document.querySelector(selector);
          if (!chrome) return [`${selector} missing`];
          const r = chrome.getBoundingClientRect();
          const points: [number, number][] = [
            [r.left + 2, r.top + 2],
            [r.right - 2, r.top + 2],
            [r.left + 2, r.bottom - 2],
            [r.right - 2, r.bottom - 2],
          ];
          return points.flatMap(([x, y]) => {
            const top = document.elementFromPoint(x, y);
            return top && chrome.contains(top) ? [] : [`${selector} at ${Math.round(x)},${Math.round(y)}`];
          });
        }),
      );
      expect(under, era).toEqual([]);
    }
  });

  test("the art is hidden from screen readers and never takes focus", async ({ page }) => {
    const art = await page.locator("[data-art]").evaluateAll((els) =>
      els.map((el) => ({
        hidden: el.closest("[aria-hidden='true']") !== null,
        focusable: el instanceof HTMLElement && el.tabIndex >= 0,
      })),
    );
    expect(art.length).toBe(ERA_IDS.length * 3);
    expect(art.every((a) => a.hidden && !a.focusable)).toBe(true);
  });

  test("an era's art is fetched only as its chapter comes near", async ({ page }) => {
    const fetched = new Set<string>();
    page.on("request", (request) => {
      const match = /\/art\/([a-z]+)-/.exec(new URL(request.url()).pathname);
      if (match?.[1]) fetched.add(match[1]);
    });
    await page.goto("/");
    await page.waitForFunction(() => window.__pw !== undefined);
    await scrollToY(page, 0);
    // The browser draws a chapter a little before it reaches the screen, and only a drawn chapter fetches its art.
    const drawn = await page
      .locator("[data-chapter]")
      .evaluateAll((chapters) =>
        chapters
          .filter((c) => c.querySelector(".track")?.checkVisibility({ contentVisibilityAuto: true }))
          .map((c) => c.getAttribute("data-chapter") ?? ""),
      );
    expect(drawn.length, "chapters drawn before scrolling").toBeLessThan(ERA_IDS.length / 2);
    expect([...fetched].sort(), "before scrolling").toEqual([...drawn].sort());
    await scrollToEra(page, "digital");
    expect(fetched.has("digital")).toBe(true);
    expect(fetched.has("machine"), "an era scrolled past without being drawn").toBe(false);
  });

  test("just below the width for margins, the emblem stands by each heading instead", async ({ page }) => {
    await page.setViewportSize({ width: WIDE - 1, height: 800 });
    for (const era of ERA_IDS) {
      await scrollToEra(page, era);
      const { art } = await state(page);
      expect(
        art.map((a) => `${a.era} ${a.part}`),
        era,
      ).toEqual([`${era} emblem`]);
    }
  });
});

test.describe("on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= WIDE, "wide screens use the margins");

  test("each chapter heading carries its era's emblem, whole and above the heading", async ({ page }) => {
    for (const era of ERA_IDS) {
      await scrollToEra(page, era);
      const found = await page.locator(`[data-chapter="${era}"]`).evaluate((chapter) => {
        const emblem = chapter.querySelector("[data-part='emblem']")?.getBoundingClientRect();
        const heading = chapter.querySelector("h2")?.getBoundingClientRect();
        if (!emblem || !heading) return null;
        return {
          size: [Math.round(emblem.width), Math.round(emblem.height)],
          above: emblem.bottom <= heading.top,
          inside: emblem.left >= 0 && emblem.right <= document.documentElement.clientWidth,
        };
      });
      expect(found, era).toEqual({ size: [56, 56], above: true, inside: true });
      const { art } = await state(page);
      expect(
        art.filter((a) => a.part !== "emblem"),
        `${era} margin art on a phone`,
      ).toEqual([]);
    }
  });

  test("the emblem is drawn in the era's accent through a mask", async ({ page }) => {
    for (const era of ERA_IDS) {
      await scrollToEra(page, era);
      const look = await page.locator(`[data-art="${era}"][data-part="emblem"]`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { mask: s.maskImage, colour: s.backgroundColor };
      });
      expect(look.mask, era).toContain(`/art/${era}-emblem.svg`);
      expect(hexOf(look.colour), era).toBe(resolveColour(tokens, "accent", era));
    }
  });
});
