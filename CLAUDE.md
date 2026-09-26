# Panic & Wonder

A scroll-driven timeline of about 400 events showing how people reacted to the new and the unknown. The page re-skins itself per era as the reader scrolls.

## Read first

- `HANDOFF.md`: the brief, the decisions already made, the build order and the open questions.
- `design-system/README.md`: the brand book. Its rules win over your own design choices.
- `prototype/seam-prototype.html`: the approved behaviour of one era change.

## Rules that must hold

- **Tokens:** use values from `design-system/tokens.json` (through the generated `tokens.css`). Never hard-code a colour, and never add one without a token.
- **Chassis vs skin:** only the skin changes per era (colours, display face, card radius and border, texture, card entrance). Layout, spine, card and row structure, body and label type and reaction shapes stay fixed.
- **Era changes:** a pure scroll-linked blend, with no flash, wipe or other transition effect. Text colours switch at the midpoint. No readable text is on screen mid-blend.
- **Every event:** each event appears on the spine, as an `EventCard` if featured and an `EventRow` otherwise. Never hide events behind "show more".
- **Reactions:** always show the shape plus the word. Colour only reinforces it.
- **Filters:** dim non-matching events, never remove them.
- **Accessibility:** respect `prefers-reduced-motion` (snap themes, no movement). Rows are native `<details>`. Keep the visible focus ring from the `focus` token.
- **Contrast:** text must pass 4.5:1 in every era theme, and a build-time test enforces it.
- **Copy:** wry, curious and fair. One or two sentences per event, no year in titles, and every event has sources before publishing.

## Commands

- `npm run dev`: the dev server. It writes `src/styles/tokens.css` and validates the event data on start, and restarts when `tokens.json` or either data file changes. A contrast failure or a data error only warns here, so it can be fixed while looking at the page.
- `npm run check:quick`: the quick check, run by the pre-commit hook (`.githooks/pre-commit`, wired up by `npm install` through `prepare`). Format, lint, types and unit tests.
- `npm run check`: the full check. The quick check, the build, the test build, then every browser test and the performance gate.
- The gates on their own:
  - `npm run format:check`: Prettier decides the formatting.
  - `npm run lint`: ESLint with typescript-eslint's strict type-aware rules. It is for mistakes, and `Math.random` is banned. It runs `astro sync` first, because the type-aware rules read Astro's generated types, which a fresh clone does not have yet.
  - `npm run typecheck`: `astro check` on Astro's strictest tsconfig.
  - `npm run test`: Vitest. It covers the tokens, the contrast gate, the eras, the markdown and the timeline.
  - `npm run contrast`: the contrast gate alone. Every pair in `CONTRAST_PAIRS` holds its ratio in all eight eras: 4.5:1 for text, and 3:1 for the focus ring and reaction marks. `astro build` runs the same gate and stops on a failure.
  - `npm run build`: the static site in `dist/`. It stops on any error in the event data: schema, unknown vocabulary, duplicate id, unsupported markdown, or an `editorial.json` id not in the export. Warnings are counted in the log.
  - `npm run build:test`: the same site in `dist-test/`, plus `window.__pw`. Every browser test runs against this build, so run it after any change before `npx playwright test`.
  - `npm run e2e`: Playwright, headless Chromium, at desktop (1280×800) and phone (375×812) size. It serves `dist-test/` itself. It holds the acceptance tests (`e2e/timeline.spec.ts`), the pictures (`e2e/look.spec.ts`), axe (`e2e/accessibility.spec.ts`) and the fuzzer (`e2e/fuzz.spec.ts`), then runs the performance gate.
  - `npm run perf`: the performance gate alone, one worker at a time so the timings are not shared with other tests. `UPDATE_PERF_BASELINE=1 npm run perf` writes new baselines.
  - Pictures: `npx playwright test e2e/look.spec.ts --update-snapshots` writes them again. Only do this for a change meant to move them, and look at every one written.
  - The fuzzer runs 20 seeds in the check. `FUZZ_SEEDS=200 npx playwright test e2e/fuzz.spec.ts` runs the wider range, `FUZZ_SEED=n` replays one failure, and `FUZZ_LOG=1` prints every step it takes.
- `npm run publish-check`: the gate before going public. It fails on every warning too: missing sources and years in titles. It is not part of `check`, because the data is not ready yet (see the baselines below).

## Layout

- `data/panic-and-wonder.json`: the events as exported by Chris. Never edit it by hand. A re-export replaces it.
- `data/editorial.json`: what the export does not hold. `featured` lists the ids shown as cards. `events` maps an id to a `verdict`, extra `sources`, a replacement `title` or `body` (markdown, like the export's), or `allowYearInTitle` with a reason. Its schema is `editorialSchema` in `src/data/schema.ts`. An id here that is missing from the export stops the build, so a re-export that renames an event is caught.
- `data/events.sample.json`: the prototype's 23 events in the handoff's proposed shape. It is kept for reference only.
- `design-system/`: the handoff's brand book, tokens and reference components, as delivered. `tokens.json` is the only source of colour, type, spacing, radius, duration and easing.
- `src/eras.ts`: the eight eras, their spans and `eraForYear`.
- `src/reactions.ts`: the closed list of reactions the site can show, each with its word, its 20×20 silhouette and the `react-*` token that fills it, and the verdicts. A reaction in the data but not here stops the build, because it has no shape yet. The contrast gate takes its reaction pairs from this table, so a new reaction is held to 3:1 as soon as it is added.
- `src/data/`: the event data, as the thing itself without its picture. `schema.ts` holds both files' shapes. `markdown.ts` renders `*italics*` and refuses everything else. `timeline.ts` is `buildTimeline`, a pure function from the two files to sorted events, vocabularies and issues. `load.ts` reads the files from disk for the integration, the tests and the scripts. `page.ts` is the pages' copy, bundled by Vite so no path is read after the build.
- `src/tokens/`: the thing itself, without its picture. It reads `tokens.json` (`tokens.ts`), writes the CSS (`css.ts`) and holds the contrast gate (`contrast.ts`). It is plain TypeScript with no DOM.
- `integrations/tokens.ts`: runs the contrast gate and writes `src/styles/tokens.css` (generated and git-ignored).
- `integrations/data.ts`: runs the data gate and logs the warning counts.
- `scripts/publish-check.ts`: the publish gate.
- `src/data/chapters.ts`: the page's plan of the timeline, pure and without its picture. `chapters()` gives every era a chapter (an empty one too), places each event as a card on a side or as a row, and counts them. `tagsOf`, `reactionsOf`, `rowMeta` and `eraSpan` give the words each shows.
- `src/random.ts`: `seeded(seed)`, the one source of chance. Nothing uses `Math.random`.
- `src/styles/`: the page's CSS. `base.css` imports the rest: the generated `tokens.css`, `fonts.css` (self-hosted faces from `@fontsource`, Latin only), `skins.css` (each era's display face, title case, card radius and border, as `--era-*` variables) and `timeline.css` (the chassis, which reads only those variables and never names an era).
- `src/components/`: `Chapter`, `Seam`, `EventCard`, `EventRow`, `EventFoot` (tags and verdict, shared by both) and `ReactionMark`. They draw what `chapters()` says and hold no rules of their own.
- `src/pages/index.astro`: the timeline. An intro in antiquity's skin, a chapter per era with a 170vh seam between each pair, and a footer in digital's skin.
- `src/client/`: the browser layer. For now it holds only the test API (`test-api.ts` for its types, `install-test-api.ts` for the code), which `components/TestApi.astro` adds in test builds. The shipped page has no script.
- `e2e/`: the Playwright tests, their helpers, the pictures (`e2e/pictures/<desktop|phone>/`), the performance instrument (`measure.ts`) and its baselines (`baselines/performance.json`).
- `scripts/serve.ts`: a static server for Playwright. Astro 7's `preview` detaches into the background when it has no terminal, so Playwright could not tell when it was ready or stop it.
- Still to come, from HANDOFF.md's build order: `src/engine/` will hold the pure scroll-engine maths (seam progress, HUD year), and `src/client/` will gain the thin layer that feeds it.

## Model features

- For tools that measure: the contrast gate. It is a pure check (`checkContrast`) over the parsed tokens, and a test builds a broken copy of the tokens to prove the gate catches it. A build-time assertion (`assertContrast`) shares the same code.
- For data checks: `buildTimeline`. It never throws on bad data. It returns every problem as an issue with a level, a code and an event id. `assertNoErrors` (build) and `assertPublishable` (publish) decide which levels stop what.
- For generated output: `tokensToCss`. It is a pure function from tokens to text. Tests read its output, and an integration writes it to disk.
- For things the user sees: the timeline. `chapters()` is the pure plan with its unit tests (`tests/chapters.test.ts`), the components draw it, `e2e/timeline.spec.ts` holds each acceptance criterion through the test API, and `e2e/look.spec.ts` holds the pictures. `EventCard` and `EventRow` are the models for anything drawn on the spine.

## The test API

- Unit tests (`tests/`, Vitest) run in Node. They call `loadTokens()` for the real tokens, and change one colour in one era on a `structuredClone` copy to set up a failing case.
- For the data, `loadTimeline()` gives the real timeline. `tests/timeline.test.ts` has `rawEvent(overrides)` and `rawExport(events)`, which build an export around the real vocabularies, so a test sets up exactly the event it needs. `buildTimeline(raw, editorial)` takes any overlay object.
- In the browser, `window.__pw` (test builds only) offers `scrollToEvent(id)`, `scrollToEra(id)`, `scrollToSeam(index, progress)` and `scrollToY(y)`. Each scrolls, waits for the frame and any fonts in flight, and does it again until the page stops moving under it, because chapters off screen are sized by an estimate until drawn. `state()` returns the scroll position, the era under the top of the viewport, the open rows, the event count, and `overflowing`: any drawn block cut off at either side. A chapter clips what overflows it, so the page's scroll width cannot show this.
- `e2e/helpers.ts` wraps these for tests, with `openTimeline(page)`, `fontsSettled(page)` and `findEvent(test, what)`, which picks the case a test needs from the real data rather than naming an id.
- Planned with filters in step 6: `setFilter`.

## The edge-case checklist

A new token, era, event field or reaction must work in every path below. The ones marked _(later)_ come with their build step.

- A colour token in every era of `tokens.json`, and in every `[data-theme]` block of `tokens.css`.
- An alias token (`{ink}`) resolves in the CSS and in the contrast gate.
- Any new text, mark or focus pairing is added to `CONTRAST_PAIRS`. Every `react-*` token is already required there by a test.
- No colour is written anywhere in `src/` outside the generated `tokens.css`, and a test enforces this.
- An event's era comes from `year.start`, including BC years, ranges, "c." dates and open-ended dates with a null `end`. The display date is the export's `date` as written.
- Events with two reactions, regions or themes. The first reaction is the main one.
- An event with no source (`null` in the export) warns, and so does a year in the title outside an italic work name, unless the overlay allows it with a reason.
- Every field of `editorial.json`, and an id in it that is not in the export.
- A reaction in the export's vocabulary that has no shape in `src/reactions.ts`.
- How each looks on a card and on a row, at both sizes: BC and approximate dates (the date keeps the export's own case, so a row never shows "C. 1000"), two reactions (both on a card and in an opened row, the first on the spine), no verdict, the longest title, and tags that wrap (the dot ends a line, never starts one).
- An era with no events still gets a chapter, so the spine and the seams stay whole.
- All seven seams, including the light–dark crossings, as a hard change at the midpoint for now.
- The phone layout: the spine at the left edge, and nothing cut off at the side with every row open.
- Keyboard and screen reader use of rows: native `<details>`, the focus ring, the marks hidden and their words read.
- _(later)_ The blend across each seam (step 4), reduced motion (step 5), filters and a filter that matches nothing (step 6).

## The gates and their baselines

- Contrast: the lowest current margins are `accent` on `ground` in machine at 4.65:1 against 4.5, `ink-muted` on `ground` in atomic at 5.55:1, and `react-panic` on `ground` in digital at 4.62:1 against 3. The tolerance is zero: any pair below its ratio fails.
- Hard-coded colours: zero, with zero tolerance.
- Event data errors: zero, with zero tolerance, held by the build.
- Publish issues, as of 2026-09-26: 176 events without sources (35 of them featured) and 4 years in titles. These hold `npm run publish-check` red until they reach zero, and the count should only fall.
- Featured share: 68 of 386 (17.6%). A test holds it between 14% and 20%, with at least one card in every era and at least two main reactions among an era's cards once it has three.
- Pictures: 48 (24 each at desktop and phone): the intro, each chapter's start, each seam's midpoint, seven edge cases and the end. The tolerance is zero changed pixels.
- Accessibility: zero axe violations (WCAG 2.1 A and AA plus best practice) in the intro and in every chapter with every row open, at both sizes.
- Fuzzer: 20 seeds of 25 steps in the check, and 200 seeds clean as of 2026-09-26. Its rules: every event once and in order, each in its own era's skin, nothing scrolling sideways or cut off at the side, a visible focus ring on whatever has keyboard focus, and an open row always showing its contents.
- Performance, at 4× CPU slowdown on this machine, held per size in `e2e/baselines/performance.json`. As of 2026-09-26 at desktop: 384 KB of HTML (42 KB gzipped), 22 KB of CSS, no script, 6,905 DOM nodes, 4 faces on first load (70 KB) and 15 by the end, first paint about 100ms, layout at load about 15ms, and about 110ms of layout across the whole scroll with its worst step at 56ms. The placeholder before this step had 21 nodes and no fonts. Sizes and counts are held within 2% (the font counts exactly). Timings are the middle of three runs and are held within a factor of two or 25ms, whichever is wider. Both are held both ways. Budgets it may never pass: 60 KB of gzipped HTML, 40 KB of CSS, no script, 9,000 nodes, 5 faces on first load, 400ms to first paint, 150ms of layout at load, 400ms of layout across the scroll, a 100ms worst step and 3 long frames.
- Not built yet: a check on a real mid-range phone (step 7).
