A scroll-driven timeline of how people reacted to the new and the unknown, from omens in antiquity to AI. As the reader scrolls, the whole page takes on a loose, modern take on each era's look. It evokes the period without copying it.

## The core rule: fixed chassis, changing skin

- **The chassis never changes.** It covers the layout grid, the timeline spine, the `EventCard` structure, the year HUD position, filters, spacing (`space-*`), the `body` and `label` styles, and the reaction shapes. Readers learn it once in Antiquity and can rely on it all the way to the present.
- **The skin changes per era.** It covers every colour token, the display face (`display-<era>`), the card radius and border weight, the texture overlay and how cards enter. Each era is a colour theme whose id is the era id. Set `data-theme` on the page root to `eraForYear(year).id` as the reader scrolls.
- **Evoke, don't imitate.** Take one or two signature cues per era, such as a typeface's shape, a palette or an edge treatment, and render them cleanly. No fake parchment photos, no drop caps with illuminated vines, no Comic Sans jokes.

## Eras

| Theme id | Span | Display | Card edge | Cue |
|---|---|---|---|---|
| `antiquity` | to 500 AD | `display-antiquity` (Cinzel, caps) | `radius-none` | Carved capitals, limestone and terracotta |
| `medieval` | 500–1450 | `display-medieval` (Grenze Gotisch) | `radius-none` | Vellum, vermilion, lapis blue |
| `print` | 1450–1780 | `display-print` (EB Garamond) | `radius-none` | Black ink on cream, printer's red |
| `industrial` | 1780–1900 | `display-industrial` (Abril Fatface) | `radius-none`, 2px rule | Dark bottle-green wallpaper, brass, poster fat faces |
| `machine` | 1900–1945 | `display-machine` (Josefin Sans, caps) | `radius-md` | Deco cream, black, gold and jade |
| `atomic` | 1945–1970 | `display-atomic` (Archivo 800) | `radius-lg`, no border | Mid-century white, atomic orange, teal |
| `analog` | 1970–1990 | `display-analog` (Fraunces) | `radius-lg` | Dark brown TV glow, orange, mustard |
| `digital` | 1990–now | `display-digital` (Space Mono) | `radius-sm` | Screen white, hyperlink blue |

`industrial` and `analog` are the dark eras. They give the scroll a rhythm of light, then dark, then light, and they mark the two big shifts in media: the steam press and television.

## Cards and rows

- Every event appears on the spine. Nothing sits behind a "show more".
- About one event in six is a highlight shown as an `EventCard`, alternating either side of the spine. Pick highlights for story quality and a mix of reactions and verdicts in each era.
- Every other event is an `EventRow`: one line straddling the spine that opens in place. Rows sit flush; cards take `space-8` above and below.
- With about 400 events this keeps the full timeline to roughly half the scroll length of all cards.

## Reactions: shape first, colour second

- There are four reactions: **Panic** (burst), **Credible concern** (triangle), **Wonder** (star) and **Optimism** (rising sun). Always render them with `ReactionMark`, which shows the shape plus the word in `ink`.
- `react-panic`, `react-concern`, `react-wonder` and `react-hope` fill the mark only. Their values change per era, so colour can never be the thing that tells readers the reaction.
- Filtering by reaction dims non-matching cards to 30% opacity rather than removing them, so the timeline stays continuous.

## Hindsight verdict

- Every card should carry a verdict when one is knowable: **Vindicated**, **Overblown**, **Mixed** or **Still out**. The stamp uses `label` in `ink` on `accent-soft`, with a `radius-pill` edge.
- Use **Still out** rather than guessing.

## Voice

- Wry, curious and fair. Readers should recognise themselves in the people on screen, not sneer at them. Write "Some Londoners fled to higher ground", not "Gullible peasants panicked".
- Titles are short and concrete, with the year in the date field and not in the title: "The flood that never came".
- Body copy is one or two plain sentences of what happened and how people reacted. Cite numbers only when a source backs them.
- Tags put region first, then the recurring theme: `EUROPE · PROPHECY`. Tags are uppercase `label` in `ink-muted`.

## Colour

- `ground` is the page and `ground-raised` is the cards. `ink` and `ink-muted` pass 4.5:1 on both in every era. `ink` also passes on `accent-soft`.
- `accent` is the era's identity colour, used for chapter headings, links, the active filter and the spine's progress fill. It passes 4.5:1 as text on both grounds. Put `on-accent` on accent fills.
- `rule` is decorative. Never let a hairline carry meaning on its own.
- `era-*` tokens are constant across themes. Use them for the minimap and era jump menu, where every era appears at once.
- `focus` is a 2px solid ring with a 2px offset, aliased to `ink`.

## Type

- `body` (Source Serif 4, 18/28) and `label` (IBM Plex Mono) never change. Readability is the constant thread through the timeline.
- The era display face is for titles only. Use 28/32 on cards, 64/68 on chapter headings and 40/44 in specimens. Never set body copy in it.
- Load each era's display face when the reader is one chapter away, not up front.

## Motion and transitions

- Era changes are a pure blend with no transition effect. Colours, radius, border and texture blend continuously across the seam, driven by scroll position, not time. Blend backgrounds in oklab with an eased curve over the middle 40% of the seam.
- Text colours (`ink`, `ink-muted`, `accent`, `react-*`) switch at the seam's midpoint rather than blending, so text never sits on a mid-tone in a mid-tone colour.
- Keep readable text out of the middle of the blend. Make each seam at least 170vh of scroll so no cards are on screen while the ground is mid-tone. Fade any seam caption out through the middle. Small fixed chrome, like the year HUD, switches its ground at the midpoint together with its text.
- Typefaces don't interpolate, so crossfade two layers over the blend, such as the seam's big year and the HUD's era name.
- Each seam can carry an era-appropriate backdrop that blends with the rest, such as Industrial's gaslight glow fading as Machine Age's sun rays grow.
- Cards enter over `duration-card` with `ease-enter` and leave with `ease-exit`. The year HUD ticks over `duration-hud`.
- Under `prefers-reduced-motion`, skip the seam devices, snap themes at the seam and show cards without movement.

## Iconography

- The only icons are the four reaction marks, as solid-fill 20×20 SVG. Add new reactions as new silhouettes.
- No emoji. There are no logos yet: the working title *Panic & Wonder* is set in the era's display face.
