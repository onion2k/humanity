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
