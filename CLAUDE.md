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
- **Filters:** dim non-matching events to 30%, never remove them. A dimmed event stays in the tab and reading order and returns to full strength on hover and focus.
- **Accessibility:** respect `prefers-reduced-motion` (snap themes, no movement). Rows are native `<details>`. Keep the visible focus ring from the `focus` token.
- **Contrast:** text must pass 4.5:1 in every era theme, and a build-time test enforces it. This applies to the page at rest. While a filter is set, dimmed events fall below it by design (decision 8, confirmed by Chris on 2026-09-26), and come back on hover and focus. Axe checks everything else with a filter on.
- **Copy:** wry, curious and fair. One or two sentences per event, no year in titles, and every event has sources before publishing.

## Commands

- `npm run dev`: the dev server. It writes `src/styles/tokens.css` and validates the event data on start, and restarts when `tokens.json` or either data file changes. A contrast failure or a data error only warns here, so it can be fixed while looking at the page.
- `npm run check:quick`: the quick check, run by the pre-commit hook (`.githooks/pre-commit`, wired up by `npm install` through `prepare`). Format, lint, types and unit tests.
- `npm run check`: the full check. The quick check, the build, the test build, then every browser test and the performance gate.
- The gates on their own:
  - `npm run format:check`: Prettier decides the formatting.
  - `npm run lint`: ESLint with typescript-eslint's strict type-aware rules. It is for mistakes, and `Math.random` is banned. It runs `astro sync` first, because the type-aware rules read Astro's generated types, which a fresh clone does not have yet.
  - `npm run typecheck`: `astro check` on Astro's strictest tsconfig.
  - `npm run test`: Vitest. It covers the tokens, the contrast and seam text gates, the eras, the markdown, the timeline, the engine, and the motion guard (`tests/motion.test.ts`): every `animation` or `transition` in `src/` must sit inside a `@media (prefers-reduced-motion: no-preference)` block.
  - `npm run contrast`: the contrast gate alone. Every pair in `CONTRAST_PAIRS` holds its ratio in all eight eras: 4.5:1 for text, and 3:1 for the focus ring and reaction marks. `astro build` runs the same gate and stops on a failure. It also runs the seam text gate (`tests/seam-text.test.ts`): in every seam, at a thousand points through the blend, any seam text that shows holds its ratio on the blended ground. The build runs both.
  - `npm run build`: the static site in `dist/`. It stops on any error in the event data: schema, unknown vocabulary, duplicate id, unsupported markdown, or an `editorial.json` id not in the export. Warnings are counted in the log.
  - `npm run build:test`: the same site in `dist-test/`, plus `window.__pw`. Every browser test runs against this build, so run it after any change before `npx playwright test`.
  - `npm run e2e`: Playwright, headless Chromium, at desktop (1280×800) and phone (375×812) size. It serves `dist-test/` itself. It holds the acceptance tests (`e2e/timeline.spec.ts`, `e2e/engine.spec.ts`, `e2e/reduced-motion.spec.ts`, `e2e/filters.spec.ts`, `e2e/keyboard.spec.ts` (the whole page by Tab, and pinned accessibility-tree snapshots of what a screen reader is given), and `e2e/no-script.spec.ts` for a reader without JavaScript), the pictures (`e2e/look.spec.ts`), axe (`e2e/accessibility.spec.ts`) and the fuzzer (`e2e/fuzz.spec.ts`), then runs the performance gate.
  - `npm run perf`: the performance gates alone: `e2e/performance.spec.ts` at both sizes, and `e2e/slow-phone.spec.ts`, which models a mid-range phone (6× CPU, Slow 4G, files served uncompressed as Chris chose) and holds its first paint, load, download before scrolling and long frames while scrolling the whole page. They run one worker at a time so the timings are not shared with other tests. `UPDATE_PERF_BASELINE=1 npm run perf` writes new baselines.
  - Pictures: `npx playwright test e2e/look.spec.ts --update-snapshots` writes them again. Only do this for a change meant to move them, and look at every one written.
  - The fuzzer runs 20 seeds in the check. `FUZZ_SEEDS=200 npx playwright test e2e/fuzz.spec.ts` runs the wider range, `FUZZ_SEED=n` replays one failure, and `FUZZ_LOG=1` prints every step it takes.
- `npm run publish-check`: the gate before going public. It fails on every warning too: missing sources and years in titles. It is not part of `check`, because the data is not ready yet (see the baselines below).

## Layout

- `data/panic-and-wonder.json`: the events as exported by Chris. Never edit it by hand. A re-export replaces it.
- `data/editorial.json`: what the export does not hold. `featured` lists the ids shown as cards. `seams` maps each change of era, keyed `from-to` such as `print-industrial`, to its one-line caption (markdown). A key that is not a pair of neighbouring eras stops the build, and a seam with no caption stops publishing. `events` maps an id to a `verdict`, extra `sources`, a replacement `title` or `body` (markdown, like the export's), or `allowYearInTitle` with a reason. Its schema is `editorialSchema` in `src/data/schema.ts`. An id here that is missing from the export stops the build, so a re-export that renames an event is caught.
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
- `src/pages/index.astro`: the timeline. An intro in antiquity's skin, a chapter per era with a 170vh seam between each pair, a footer in digital's skin, the HUD, and the engine's one script.
- `src/client/`: the browser layer. `engine.ts` measures the chapters and seams on each frame after a scroll, a resize or any change in their size, asks the engine where the reader is, and writes back only what changed: the active seam's `--pc`, its stage's skin and its text's opacity, and the HUD. The test API is `test-api.ts` for its types and `install-test-api.ts` for the code, which `components/TestApi.astro` adds in test builds.
- `e2e/`: the Playwright tests, their helpers, the pictures (`e2e/pictures/<desktop|phone>/`), the performance instrument (`measure.ts`) and its baselines (`baselines/performance.json`).
- `docs/manual-checks.md`: what only a person can check. A real phone, VoiceOver on iPhone and Mac, Safari and Firefox (Chris chose not to download Playwright's WebKit and Firefox on 2026-09-26, so none of the automated checks run in them).
- `src/client/settle.ts`: `whenStill`, `landOn` and `keepInView`. A scroll towards something far away (an era jump, or the browser following Tab) passes events that are drawn for the first time on the way and change height, so these wait frame by frame until the page is still and put it right. The engine uses `keepInView` for anything focused in `main`. Both drop a correction if the reader has moved since (a wheel, touch, press or non-Tab key), and `keepInView` only puts right a near miss, so the page never pulls a reader back to somewhere they chose to leave.
- `scripts/serve.ts`: a static server for Playwright. Astro 7's `preview` detaches into the background when it has no terminal, so Playwright could not tell when it was ready or stop it.
- `src/engine/`: the scroll engine's maths, pure and tested headless. `blend.ts` turns how far the middle of the screen is through a seam into the eased blend (`pc`), the text switch at the midpoint (`pi`) and each text layer's opacity; `blendAt(raw, true)` is the reduced-motion snap. `reading.ts` finds the chapter or seam under the middle of the screen and the HUD's year, reading as few rectangles as it can (`lastAtOrAbove` is a binary search).
- `src/tokens/oklab.ts` mixes colours as CSS `color-mix(in oklab, …)` does. `src/tokens/seams.ts` is the seam text gate: `seamFades` works out from the palette how far into each blend the caption and the big year can stay before the ground takes them below 4.5:1 and 3:1, and `seamTextFailures` checks it. `src/tokens/page.ts` is the pages' copy of the tokens, bundled like `src/data/page.ts`.
- `src/engine/filter.ts`: which events a filter leaves undimmed (any ticked option within a group, every group with something ticked, on any of an event's values), how a filter is written into the address (`?reaction=panic,wonder&region=europe`) and read back ignoring unknown values, and what the count says.
- `src/components/FilterPanel.astro` and `src/client/filters.ts`: the Filter button's panel (reaction, region and theme checkboxes, a live count, Clear, and the era menu with each era's `era-*` swatch, span and count) and the script that dims events and keeps the filter in the address with `replaceState`. Each event carries its filter values as `data-reactions`, `data-regions` and `data-themes`. The fixed chrome, the panel and the HUD wear the skin of the era being read (`data-skin="reading"`); the dark eras set `color-scheme: dark` so native controls match.
- `src/components/Seam.astro` and `Hud.astro`: the seam's stage (the next era's year in both faces, and the caption) and the HUD. Without the engine the stage is clear and the HUD hidden, so the seam's two halves still change the skin at its midpoint.
- `skins.css` gives each era a `.face-<era>` class too, which takes the era's face without its colours, for text that crossfades faces while wearing one era's colours.

## Model features

- For tools that measure: the contrast gate. It is a pure check (`checkContrast`) over the parsed tokens, and a test builds a broken copy of the tokens to prove the gate catches it. A build-time assertion (`assertContrast`) shares the same code.
- For data checks: `buildTimeline`. It never throws on bad data. It returns every problem as an issue with a level, a code and an event id. `assertNoErrors` (build) and `assertPublishable` (publish) decide which levels stop what.
- For generated output: `tokensToCss`. It is a pure function from tokens to text. Tests read its output, and an integration writes it to disk.
- For things the user sees: the timeline. `chapters()` is the pure plan with its unit tests (`tests/chapters.test.ts`), the components draw it, `e2e/timeline.spec.ts` holds each acceptance criterion through the test API, and `e2e/look.spec.ts` holds the pictures. `EventCard` and `EventRow` are the models for anything drawn on the spine.

## The test API

- Unit tests (`tests/`, Vitest) run in Node. They call `loadTokens()` for the real tokens, and change one colour in one era on a `structuredClone` copy to set up a failing case.
- For the data, `loadTimeline()` gives the real timeline. `tests/timeline.test.ts` has `rawEvent(overrides)` and `rawExport(events)`, which build an export around the real vocabularies, so a test sets up exactly the event it needs. `buildTimeline(raw, editorial)` takes any overlay object.
- In the browser, `window.__pw` (test builds only) offers `scrollToEvent(id, offset)` (the event's top `offset` pixels below the top of the screen), `scrollToEra(id)`, `scrollToSeam(index, raw)` (the middle of the screen `raw` of the way through the seam, the engine's own measure) and `scrollToY(y)`, `settle()`, which steps frames until a keyboard or other smooth scroll has stopped, and `setFilter(filter)`, which ticks exactly those boxes. Each scrolls, waits for the frame and any fonts in flight, and does it again until the page has stopped moving under it (to within a pixel, which is as fine as a scroll lands), because chapters off screen are sized by an estimate until drawn. `state()` returns the scroll position, the era under the top of the viewport, the open rows, the event count, `overflowing` (any drawn block cut off at either side), `hud` (its year, era and skin), `filter`, `dimmed` (the ids), `count`, `panelOpen` and `seam` (the active seam's `pc`, `pi`, skin, drawn ground and every text layer's drawn colour and opacity, all colours as #rrggbb). A chapter clips what overflows it, so the page's scroll width cannot show this.
- `e2e/helpers.ts` wraps these for tests, with `openTimeline(page)`, `fontsSettled(page)` and `findEvent(test, what)`, which picks the case a test needs from the real data rather than naming an id.

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
- All seven seams, including the four light–dark crossings: the ground blends, text switches at the midpoint, and seam text fades by contrast. A seam with no caption, and the big year on one line at phone width.
- The HUD: above the first event, in a chapter before its first event (the era's first year, so it never runs backwards), in a seam either side of the midpoint, at the end, after a row opens under it, and at phone width.
- The phone layout: the spine at the left edge, and nothing cut off at the side with every row open.
- Keyboard and screen reader use of rows: native `<details>`, the focus ring, the marks hidden and their words read.
- Reduced motion: every seam snaps at its midpoint onto one era's ground, the big year shows in one face, the caption stays (it is always on its own era's ground), nothing animates, and turning the setting on or off mid-page takes effect on the next frame. Any new motion goes inside a no-preference block, and the motion guard fails the tests if it does not.
- Filters: every reaction, region and theme as a labelled checkbox; a filter on a second reaction, region or theme; a filter that matches nothing (all dimmed, and the count says how to get them back); a shared address with unknown values; a dimmed event under hover and focus; the panel by keyboard, closing with Escape to the button; the panel over the reading on a phone (a bottom sheet), in dark eras and while the skin switches under it.
- Keyboard: Tab reaches the Filter button first (the chrome is first in the page), then every row in page order, each with its whole 2px ring on screen and clear of the chrome, going down and coming back up. The page's `scroll-padding-top` and `scroll-padding-bottom` keep scrolled-to things clear of the chrome and the edge. Decorations drawn by CSS (the row's + and −, the tag dots) carry empty alternative text so a screen reader does not read them.
- Events are skipped (`content-visibility: auto`) one by one as well as by chapter. Anything that reads an event's position should read its slot (`li.slot`), which is always laid out, or it forces the layout the skipping saves. Anything drawn outside an event's box, such as the card's marker or the focus ring, must stay within the slot's 64px clip margin.
- Fixed chrome (the HUD, the Filter button, anything new pinned to the screen) has whole-pixel widths that fit its longest content at both sizes. At a fractional position its layer's text is drawn a hair differently from run to run, which makes the pictures flake.
- The era menu: every era, its swatch, span and count, landing below the fixed chrome, with the panel closed and the HUD agreeing.
- _(later)_ Era backdrops, textures and card entrances (a separate design pass; card entrances must sit behind the motion guard).

## The gates and their baselines

- Contrast: the lowest current margins are `accent` on `ground` in machine at 4.65:1 against 4.5, `ink-muted` on `ground` in atomic at 5.55:1, and `react-panic` on `ground` in digital at 4.62:1 against 3. The tolerance is zero: any pair below its ratio fails.
- Hard-coded colours: zero, with zero tolerance.
- Event data errors: zero, with zero tolerance, held by the build.
- Publish issues, as of 2026-09-26: 176 events without sources (35 of them featured) and 4 years in titles. These hold `npm run publish-check` red until they reach zero, and the count should only fall.
- Featured share: 68 of 386 (17.6%). A test holds it between 14% and 20%, with at least one card in every era and at least two main reactions among an era's cards once it has three.
- Pictures: 144 (72 each at desktop and phone): the intro, each chapter's start, each seam at 15%, 40%, 50%, 60% and 85% of the way through, each seam at 45% and 55% under reduced motion, the filter panel open in three eras, a filtered chapter, a filter matching nothing, a dimmed row with focus, seven edge cases and the end. The tolerance is zero changed pixels.
- Seam text: zero points below ratio in all seven seams, with zero tolerance, held by the build.
- Motion: zero animations or transitions outside a no-preference block, and zero running animations under reduced motion, with zero tolerance.
- Accessibility: zero axe violations (WCAG 2.1 A and AA plus best practice) in the intro and in every chapter with every row open, at both sizes.
- Fuzzer: 20 seeds of 25 steps in the check, and 200 seeds clean as of 2026-09-26. Its rules: every event once and in order, each in its own era's skin, nothing scrolling sideways or cut off at the side, a visible focus ring on whatever has keyboard focus, an open row always showing its contents, the HUD's year between the last event above the reading line and the first below it (read from the page, not the engine), any seam text that shows holding its ratio, and, under reduced motion (which it turns on and off as a reader can), no seam part way through its blend and nothing animating. It filters as a reader does (opening the panel, ticking boxes, jumping to eras), and checks that exactly the non-matching events are dimmed and the address says what is ticked, written out again in the page rather than borrowed from the engine. It only clicks a row nothing lies over. The rules are checked once the page has settled after each step.
- Performance, at 4× CPU slowdown on this machine, held per size in `e2e/baselines/performance.json`. As of 2026-09-26 at desktop, after step 7: 440 KB of HTML (48 KB gzipped), 28 KB of CSS, 7.5 KB of script, 7,157 DOM nodes, 5 faces on first load (87 KB) and 15 by the end, first paint about 90ms, layout at load about 15ms, and across the whole scroll about 120ms of layout, 125ms of style and 575ms of all work, with its worst step at about 35ms and no long frames. Applying a filter takes about 3ms. Step 3 had no script, 4 faces on first load and about 400ms of work across the scroll; the engine adds about 2ms per scroll step at this slowdown. Sizes and counts are held within 2% (the font counts exactly). Timings are the middle of three runs and are held within a factor of two or 25ms, whichever is wider. Both are held both ways. Budgets it may never pass: 60 KB of gzipped HTML, 40 KB of CSS, 9,000 nodes, 5 faces on first load, 10 KB of script, 400ms to first paint, 150ms of layout at load, 400ms of layout across the scroll, a 100ms worst step, 3 long frames and 100ms to apply a filter.
- Slow phone, held in `e2e/baselines/slow-phone.json`: largest paint about 660ms against a budget of 2.5s, load about 3.2s against 4s, 550 KB before scrolling (uncompressed) against 600 KB, and no long frames scrolling the whole page at 120px a frame, against a budget of none. Timings are held within a factor of two or 250ms, and the size within 2%, both ways.
- Not automated: a real phone, a real screen reader, Safari and Firefox. See `docs/manual-checks.md`.
