# Manual checks

The automated checks cover a great deal, but not everything. They run in Chromium only, and they model a slow phone rather than use one. They can read what a screen reader is given, but they can't hear it. These checks are the rest. Each one takes a few minutes.

## Open the site on your phone

On the Mac, run these in a terminal of your own:

```bash
npm run build
npx astro preview --host
```

Open the Network address it prints (`http://192.168.…:4321`) on a phone on the same Wi-Fi.

## A real mid-range phone

Use an Android phone from a few years ago if you can. An iPhone is fine too, but it's faster than most readers' phones.

- **The first screen** shows the title and Antiquity within about a second. The automated slow phone sees it at about 0.7s.
- **A steady scroll from top to bottom** never judders, including through Digital, the longest chapter with 161 events.
- **In every seam** the colours blend smoothly, the text fades before the ground turns mid-tone, and the HUD changes at the midpoint.
- **A quick flick** into the middle of a seam doesn't leave the page half-blended once it stops.
- **The Filter button:** tick a reaction and the dimming appears at once. Then close the sheet.
- **The era menu:** "Jump to an era" lands with the era's heading just below the Filter button and HUD.
- **Turn on Reduce Motion** (iPhone: Settings › Accessibility › Motion; Android: Remove animations). Each seam should now change all at once, with nothing sliding or fading.

## VoiceOver on the iPhone

Turn it on in Settings › Accessibility › VoiceOver, or triple-click the side button if you've set that up.

- **Swiping through a card** reads its reactions as words (for example "Celebration, Optimism"), then the date as written, the title as a heading, the story and the tags. No shapes are named, and no "plus", "minus" or "dot" is read.
- **A row** reads as, for example, "Wonder · 1783, First balloon flights, collapsed". Double-tapping it reads "expanded", and the story follows.
- **The rotor set to Headings** lists the eight eras in order, and each card's title below its era.
- **The HUD is never read.** The chapter headings carry the same information.
- **The Filter button** reads "Filter, button, collapsed". Once it's open, each checkbox reads its word, and ticking one announces the new count.
- **With a filter set,** dimmed events are still read out. They're dimmed, not hidden.

## VoiceOver on the Mac, with Safari

Turn it on with Cmd+F5. Use Safari, since the automated checks never do.

- **Tab from the top** reaches the Filter button first, then each row in order. Each focused row has a clear 2px ring and never sits under the Filter button or HUD.
- **Enter or Space** on a row opens it, and again closes it.
- **The filter panel:** Tab into it, tick boxes with Space, and press Escape. The panel closes and focus returns to the Filter button.
- **Safari's rendering:** every seam blends (this relies on `color-mix` in oklab), the stage stays put while the seam passes, and the chapters' layout matches Chrome's.

## Firefox

- Scroll once from top to bottom. The seams blend, the HUD follows, and nothing overlaps.
- Set a filter, copy the address, and open it in a new window. The same events are undimmed.

## What to do with a problem

Note the era, the event or seam, the device and the browser, and a screenshot if you can. Most problems can then be written as a test before they're fixed.
