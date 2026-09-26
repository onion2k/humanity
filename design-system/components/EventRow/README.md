# EventRow

The compact form of an event: one line on the spine that opens in place to show the full story.

**The consumer provides** a `TimelineEvent`, the same data as `EventCard`, and an ancestor carrying `data-theme="<era id>"`.

- Every event on the site appears on the spine, either as an `EventCard` (a highlight) or an `EventRow` (everything else). Nothing is hidden.
- Use `EventCard` for about one event in six: the best stories, with a good mix of reactions and verdicts per era. Everything else is a row.
- The closed row shows reaction word and year (`label`, `ink-muted`) left of the spine, the reaction mark on the spine, and the title in the era display face at 20px right of the spine. The reaction keeps both its shape and its word.
- Tapping opens the body, tags and verdict beneath the title, on the right of the spine. It is a native `<details>` element, so it works with keyboard and screen readers without script.
- Rows sit flush with each other, 40px minimum height. Highlight cards take `space-8` above and below.
- At phone width the spine moves to the left edge and the meta line drops under the title.
- Filtering by reaction or theme dims rows the same way as cards.
