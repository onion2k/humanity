# Panic & Wonder: build handoff

A scroll-driven website showing how people have reacted to new and unusual events, from omens in antiquity to AI. There are about 400 events. As the reader scrolls from the ancient world to the present, the whole page takes on a loose, modern take on each era's look and blends smoothly between them.

*Panic & Wonder* is a working title.

This folder holds everything decided so far. Read this file first, then `design-system/README.md`.

## What's in this folder

| Path | What it is | Status |
|---|---|---|
| `design-system/README.md` | The brand book: the rules for eras, reactions, verdicts, voice, colour, type and motion | **Source of truth.** Follow it. |
| `design-system/tokens.json` | All tokens: 8 era colour themes, type families and styles, spacing, radius, duration, easing | Source of truth. Colours are contrast-checked in every era. |
| `design-system/components/` | `EventCard`, `EventRow` and `ReactionMark` as a small vanilla-JS reference bundle (`bundle.js`, `bundle.css`, `index.d.ts`), with a README of guidelines per component | Reference implementation. Port it into the real stack; don't ship it as is. |
| `prototype/seam-prototype.html` | Working prototype of one era change (Industrial → Machine Age at 1900) with real cards and rows | Approved behaviour. Open it in a browser and scroll. |
| `data/events.sample.json` | The prototype's 23 events in the proposed data shape | Sample only. The full ~400 events will come from Chris. |

The component `preview.html` files expect the design-system viewer to inject `tokens.css`, so they don't render correctly when opened on their own. Use the prototype to see things working.

The live design system and prototype also exist as claude.ai artifacts. This folder is a snapshot of them as of 26 September 2026.

## Decisions already made

Don't reopen these without asking Chris.

1. **Fixed chassis, changing skin.** Layout, spine, card structure, year HUD, filters, spacing, body and label type and the reaction shapes never change. Colours, display face, card radius and border, texture and card entrance change per era.
2. **Loose modern take on each era.** Evoke the period with one or two cues, never pastiche. No fake parchment, no novelty fonts for body text.
3. **Eight eras**, each a theme: `antiquity` (to 500), `medieval` (500–1450), `print` (1450–1780), `industrial` (1780–1900), `machine` (1900–1945), `atomic` (1945–1970), `analog` (1970–1990), `digital` (1990–now). `industrial` and `analog` are dark.
4. **Era changes are a pure blend with no transition effect.** A flicker "moment" was tried and rejected. How it works:
   - Background, raised surface, rule, card radius, border and texture blend continuously with scroll position. Blend colours in oklab with an eased curve over the middle 40% of the change.
   - Text colours (`ink`, `ink-muted`, `accent`, `react-*`) switch at the midpoint instead of blending.
   - No readable text is on screen mid-blend. Each change spans at least 170vh of scroll with no cards in it, and the change's caption fades out through the middle.
   - Small fixed chrome (the year HUD) switches its background at the midpoint along with its text.
   - Typefaces crossfade across two stacked layers, for the change's big year and the HUD's era name.
   - Each change can carry an era backdrop that blends too (the prototype's gaslight glow fading into Deco sun rays).
5. **Every event is visible on the timeline (option B).** About one event in six is a highlight `EventCard`, alternating either side of the spine. Every other event is an `EventRow`: one line straddling the spine that opens in place as a native `<details>`. Nothing is hidden behind "show more". This gives roughly 45–50 desktop screens for 400 events.
6. **Reactions are shown by shape plus word, never colour alone.** Panic is a burst, Credible concern a triangle, Wonder a star and Optimism a rising sun. Colour fills are per era and only reinforce the shape.
7. **A hindsight verdict on every event:** Vindicated, Overblown, Mixed or Still out.
8. **Filtering dims rather than removes.** Filters (region, theme, reaction) dim non-matching events to 30% opacity so the timeline stays continuous.
9. **Voice: wry, curious and fair.** Never sneer at people in the past.

## Proposed data shape

```ts
interface TimelineEvent {
  id: string;            // "1844-the-great-disappointment"
  year: number;          // negative for BC
  dateLabel?: string;    // optional display override, e.g. "c. 1000"
  title: string;         // short, concrete, no year in it
  body: string;          // 1–2 plain sentences
  reaction: "panic" | "concern" | "wonder" | "hope";
  region: string;        // filterable, e.g. "Britain"
  themes: string[];      // filterable recurring themes, e.g. ["Prophecy"]
  verdict: "vindicated" | "overblown" | "mixed" | "open";
  featured: boolean;     // true = EventCard, false = EventRow
  sources: string[];     // URLs; required before publishing
}
```

The design system's `TimelineEvent` has a single `tags` array. Render it as `[region, ...themes]`, since the two are split here to make filtering easier. The era comes from `year` (see `eraForYear` in `bundle.js`); don't store it.

## Suggested stack

This is a suggestion, and Chris may have a preference. Use a static site such as Astro, with events in a content collection or JSON validated against the schema at build time. Keep client JavaScript to vanilla TypeScript for the scroll engine. No client framework is needed.

- Generate `tokens.css` from `tokens.json` at build time. Each theme becomes a `[data-theme="<era>"]` block; spacing, radius, fonts, duration and easing go on `:root`.
- Port the prototype's seam logic: one scroll listener throttled with requestAnimationFrame writes `--pc` (blend progress) and `--pi` (the text switch) for the active seam. Colours use `color-mix(in oklab, …)` between the two eras' tokens. Register `--pc` and `--pi` with `@property`.
- Card entrances use `animation-timeline: view()` behind `@supports`, with the cards visible by default.
- Use `content-visibility: auto` on each era chapter, so the 400 events don't all lay out at once.
- Load fonts from Google Fonts for now: each era's display face when the reader is one chapter away, not up front. Self-host them later if needed.

## Build order

1. Scaffold the project, generate `tokens.css` from `tokens.json`, and add a contrast test that fails the build if any text pair listed in the README drops below its ratio in any era.
2. Add the data schema and validation, and load `events.sample.json`.
3. Build the static timeline: era chapters, spine, `EventCard` (featured), `EventRow` (the rest), and the phone layout (spine at left edge).
4. Build the scroll engine: the seam blend between every pair of adjacent eras, following decision 4, and the year HUD.
5. Handle reduced motion: when `prefers-reduced-motion` is set, themes snap at each era change's midpoint and nothing moves.
6. Add filters (region, theme, reaction; dimming) and an era jump menu or minimap coloured with the `era-*` tokens.
7. Load the full ~400 events, then check performance on a mid-range phone and run an accessibility pass (keyboard through rows, focus ring, screen reader reading of reactions).

## Done means

- All eight eras render with their tokens, and all seven era changes blend with no text ever shown mid-tone.
- Every event is reachable by scrolling, with featured events as cards and the rest as rows.
- The contrast test passes in every era.
- Reduced motion works, and keyboard and screen-reader use of rows and filters work.
- Scrolling stays smooth with 400 events on a mid-range phone.

## Open questions for Chris

- **The site's name.** *Panic & Wonder* is a placeholder.
- **Where the ~400 events live now,** and in what format, so they can be imported. Which ones are featured, and are sources collected?
- **Hosting.**
- **Only one era change is tested so far** (industrial → machine, dark to light). The other six need a quick visual review each. The riskiest are the other light–dark crossings: print → industrial, atomic → analog and analog → digital.
- **Change length.** It could drop from 170vh to about 120vh to shorten the scroll. This is untested.
- **The Antiquity span.** It covers thousands of years with few events, so each era's scroll length should follow its event count, not its span of years.
