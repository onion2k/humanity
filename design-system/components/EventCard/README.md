# EventCard

One moment on the timeline: a reaction mark, the date, a title in the era's display face, one or two sentences, region and theme tags, and a hindsight verdict.

**The consumer provides** a `TimelineEvent` (`year`, `title`, `body`, `reaction`, optional `tags` and `verdict`) and an ancestor carrying `data-theme="<era id>"` — use `eraForYear(year).id`. The card never picks its own skin.

- Structure is identical in every era: mark + year row, title, body, tags + verdict row. Only the skin changes (display face, radius, border weight, colours).
- Title: `display-<era>` at 28px/32px. Body: `body`. Year and tags: `label`.
- Keep `body` to two sentences. Longer stories go in a detail view.
- Tags: region first, then recurring theme. Max three.
- Verdict is optional but encouraged: it is the hook. Use `open` rather than guessing.
- Cards enter over `duration-card` with `ease-enter`; under reduced motion they appear without movement.
- Don't colour the whole card by reaction. The mark carries it.
