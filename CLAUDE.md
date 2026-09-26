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

- `npm run dev`: the dev server. It writes `src/styles/tokens.css` on start and restarts when `design-system/tokens.json` changes. A contrast failure is a warning here, so the palette can be fixed while looking at it.
- `npm run check:quick`: the quick check, run by the pre-commit hook (`.githooks/pre-commit`, wired up by `npm install` through `prepare`). Format, lint, types and unit tests.
- `npm run check`: the full check. The quick check, then the build.
- The gates on their own:
  - `npm run format:check`: Prettier decides the formatting.
  - `npm run lint`: ESLint with typescript-eslint's strict type-aware rules. It is for mistakes, and `Math.random` is banned.
  - `npm run typecheck`: `astro check` on Astro's strictest tsconfig.
  - `npm run test`: Vitest, which covers the token and contrast tests below.
  - `npm run contrast`: the contrast gate alone. Every pair in `CONTRAST_PAIRS` holds its ratio in all eight eras: 4.5:1 for text, and 3:1 for the focus ring and reaction marks. `astro build` runs the same gate and stops on a failure.
  - `npm run build`: the static site in `dist/`.

## Layout

- `data/panic-and-wonder.json`: the events as exported by Chris. Never edit it by hand. A re-export replaces it. Editorial fields (featured, verdict, extra sources, copy fixes) will live in `data/editorial.json`, keyed by event id (build step 2). `data/events.sample.json` is the prototype's 23 events in the handoff's proposed shape. It is kept for reference only.
- `design-system/`: the handoff's brand book, tokens and reference components, as delivered. `tokens.json` is the only source of colour, type, spacing, radius, duration and easing.
- `src/eras.ts`: the eight era ids in timeline order.
- `src/tokens/`: the thing itself, without its picture. It reads `tokens.json` (`tokens.ts`), writes the CSS (`css.ts`) and holds the contrast gate (`contrast.ts`). It is plain TypeScript with no DOM.
- `integrations/tokens.ts`: the Astro integration that runs the gate and writes `src/styles/tokens.css` (generated and git-ignored).
- `src/styles/`: the page's CSS. `base.css` imports the generated tokens.
- `src/pages/`: the pages that present it. `index.astro` is a placeholder until build step 3.
- Still to come, from HANDOFF.md's build order:
  - `src/engine/` will hold the pure scroll-engine maths (seam progress, HUD year).
  - `src/client/` will hold the thin browser layer that feeds it.

## Model features

- For tools that measure: the contrast gate. It is a pure check (`checkContrast`) over the parsed tokens, and a test builds a broken copy of the tokens to prove the gate catches it. A build-time assertion (`assertContrast`) shares the same code.
- For generated output: `tokensToCss`. It is a pure function from tokens to text. Tests read its output, and an integration writes it to disk.
- For things the user sees: none yet. The `EventCard` and `EventRow` in build step 3 will be the models.

## The test API

- Unit tests (`tests/`, Vitest) run in Node. They call `loadTokens()` for the real tokens, and change one colour in one era on a `structuredClone` copy to set up a failing case.
- Not built yet: a browser test API (`window.__pw` in test builds, driven by Playwright). It is planned to offer `scrollToYear`, `scrollToSeam(index, progress)`, `state()` and `setFilter`, so tests set scroll position directly and never wait on a timeout.

## The edge-case checklist

A new token, era, event field or reaction must work in every path below. The ones marked _(later)_ come with their build step.

- A colour token in every era of `tokens.json`, and in every `[data-theme]` block of `tokens.css`.
- An alias token (`{ink}`) resolves in the CSS and in the contrast gate.
- Any new text, mark or focus pairing is added to `CONTRAST_PAIRS`. Every `react-*` token is already required there by a test.
- No colour is written anywhere in `src/` outside the generated `tokens.css`, and a test enforces this.
- _(later)_ BC years, date ranges, "c." dates, open-ended dates and events with two reactions, regions or themes.
- _(later)_ All seven seams, including the light–dark crossings. Reduced motion. The phone layout. Keyboard and screen reader use of rows and filters. A filter that matches nothing.
- _(later)_ An event missing sources, verdict or featured status. A re-export of the data that keeps `editorial.json` in step.

## The gates and their baselines

- Contrast: the lowest current margins are `accent` on `ground` in machine at 4.65:1 against 4.5, `ink-muted` on `ground` in atomic at 5.55:1, and `react-panic` on `ground` in digital at 4.62:1 against 3. The tolerance is zero: any pair below its ratio fails.
- Hard-coded colours: zero, with zero tolerance.
- Not built yet: performance, look and accessibility baselines. They arrive with the Playwright setup in build steps 3–7, and each gets a budget and a tolerance when it does.
