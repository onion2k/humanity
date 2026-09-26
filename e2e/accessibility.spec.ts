// Axe on every chapter, at both sizes, with every row in it opened so the
// hidden half of each event is checked too. The contrast gate proves the
// tokens pass; this proves the page uses them where it should.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ERA_IDS } from "../src/eras.ts";
import { openTimeline, scrollToEra, scrollToY } from "./helpers.ts";

const RULES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

test.beforeEach(async ({ page }) => {
  await openTimeline(page);
});

test("the intro and the landmarks around the chapters", async ({ page }) => {
  await scrollToY(page, 0);
  const result = await new AxeBuilder({ page }).withTags(RULES).include(".intro").analyze();
  expect(result.violations).toEqual([]);
});

for (const era of ERA_IDS) {
  test(`the ${era} chapter, every row open`, async ({ page }) => {
    await page.locator(`[data-chapter="${era}"] details.event-row`).evaluateAll((rows) => {
      for (const row of rows) (row as HTMLDetailsElement).open = true;
    });
    await scrollToEra(page, era);
    const result = await new AxeBuilder({ page })
      .withTags(RULES)
      .include(`[data-chapter="${era}"]`)
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target) })),
    ).toEqual([]);
  });
}

test("the page as a whole: one h1, one main, the chapters as labelled regions", async ({ page }) => {
  const result = await new AxeBuilder({ page })
    .withRules(["page-has-heading-one", "landmark-one-main", "landmark-unique", "heading-order", "region"])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
