# Manual checks

The automated checks cover a great deal, but not everything. They run in Chromium only, and they model a slow phone rather than use one. They can read what a screen reader is given, but they can't hear it. These checks are the rest. Each one takes a few minutes, and says what you should see or hear.

## Open the site on your phone

On the Mac, run these in a terminal of your own:

```bash
npm run build
npx astro preview --host
```

Open the Network address it prints (`http://192.168.…:4321`) on a phone on the same Wi-Fi.

## A real mid-range phone

Use an Android phone from a few years ago if you can. An iPhone is fine too, but it's faster than most readers' phones.

- **The first screen** shows the title and the start of Antiquity within about a second. The figure the automated slow phone is held to is in `e2e/baselines/slow-phone.json`.
- **The HUD and the Filter button** stay put as the page scrolls. The HUD is alone at the top right, and at the top of the page it shows Antiquity and the first year named in the line under the title. The Filter button is at the bottom right, big enough for a thumb, and clear of the browser's own bars.
- **A steady scroll from top to bottom** never judders, including through Digital, the longest chapter, and the page never moves sideways.
- **At each change of era** there is a short band, 160px tall, which is a fifth to a quarter of a phone's screen. In it the ground blends evenly from one era's colour into the next. Nothing is written in it and nothing in it moves, and the next era's heading follows at once. There are seven bands. Four join a light era to a dark one, either side of Industrial and either side of Analog.
- **The spine** is one thin line near the left edge, from the top of Antiquity to the end of Digital. It runs through every band without a gap or a step sideways, and changes colour with the ground. Every row's mark sits on it, and so does the small diamond beside every card.
- **Under each era's heading** are its span and its count of events, then a caption of one sentence. All three sit to the right of the spine, and nothing is cut off at the right edge.
- **The HUD's year** is that of the event just below the middle of the screen, and it never goes backwards as you scroll down. At the end of the page it shows the last event's year.
- **The HUD in a band** keeps the earlier era's name and colours until the middle of the band reaches the middle of the screen. Then it changes all at once to the later era's name and colours, and to the year that starts the span under the next heading. The Filter button changes colour at the same moment. Scrolling back up, both change back at the same place.
- **A hard flick** down the page, left to come to rest, leaves no blank stretch. The events on screen are drawn in full, and the HUD names their era.
- **Tap a row** and it opens in place. Its + turns to −, and its story, its reactions as shape and word, and its tags show in a box to the right of the spine. Tap it again and it closes.
- **The Filter button** opens a sheet just above it, nearly as wide as the screen, with its title and its count in plain view below the HUD. The sheet scrolls by itself, and when it reaches its end the page behind stays still. Tap the button again and the sheet closes.
- **Tick a reaction** and the events that don't match dim at once. The count at the top of the sheet says how many match, and the Filter button shows the same number.
- **With a filter set,** dimmed events keep their places on the spine. Tap a dimmed row or a dimmed card and it comes back to full strength.
- **In Industrial and Analog,** the two dark eras, the sheet is dark too, tick boxes and all.
- **The era menu** is at the foot of the sheet. "Jump to an era" lists the eight eras, each with a dot of its colour, its span and its count. Tap one: the sheet closes and the page glides to that era, stopping with its heading just below the HUD.
- **Turn on Reduce Motion** (iPhone: Settings › Accessibility › Motion › Reduce Motion; Android: Settings › Accessibility › Colour and motion › Remove animations) and load the page again. A jump from the era menu now lands at once, without gliding. Nothing else changes, because nothing else moves: the bands are the same still blends, and the HUD changes at the same places.

## VoiceOver on the iPhone

Turn it on in Settings › Accessibility › VoiceOver, or with three clicks of the side button if you've set up the Accessibility Shortcut. VoiceOver adds words of its own for what each thing is, such as "heading" or "collapsed", so its wording will differ a little from the examples here. Listen for the page's own words, and for anything read that shouldn't be.

- **Swiping through a card** reads its reactions as words (for example "Celebration, Optimism"), then the date as written, the title as a heading, the story and the tags. No shape is named, and no dot is read between the tags.
- **A row** reads its reaction, its date and its title (for example "Wonder, 1783, First balloon flights"), and says it is collapsed. Double-tap it and it says expanded, and the story, the reactions and the tags follow. Its + and − are never read.
- **The dot between a row's reaction and its date,** and the one in each era's span, are part of the text the page gives. VoiceOver should pause there or pass over them. Note it if it names them.
- **Between two eras** nothing is read for the band. After an era's last event, the next swipe reads the next era's name as a heading, then its span and count, then its caption.
- **The rotor set to Headings** goes from the title to each of the eight eras in order, with each card's title under its era. Rows aren't headings.
- **The rotor set to Landmarks** finds the eight eras by name.
- **The HUD is never read.** The chapter headings carry the same information.
- **Words set in capitals,** such as Filter, the reactions on rows and the tags, are read as words and not spelt out.
- **The Filter button** reads "Filter, button, collapsed". Double-tap it and the sheet opens. The sheet follows its button in the page's reading order, so the next swipe goes into it, starting with its title, "Filter events".
- **In the sheet,** each box reads its word and whether it's ticked, under Reaction, Region or Theme. Ticking one announces the new count.
- **With a filter set,** the Filter button reads the number that match after its name, and dimmed events are still read out. They're dimmed, not hidden.
- **The era menu** reads each era's name, span and count as one link. Double-tap one and the sheet closes and the page moves to that era. The next swipe should carry on from the era's heading.

## VoiceOver on the Mac, with Safari

Turn it on with Cmd+F5, or hold Cmd and press Touch ID three times. Use Safari, since the automated checks never do. If Tab passes over the rows, turn on "Press Tab to highlight each item on a webpage" in Safari › Settings › Advanced.

- **Tab from the top** reaches the Filter button first, then each row in order down the page. Cards have nothing to press, so Tab passes over them. Each focused row has a clear 2px ring on all four sides, and never sits under the Filter button or HUD, or off the edge of the window.
- **Tab across a change of era** carries on from the last row of one era to the first row of the next, and the page follows.
- **Shift+Tab** goes back up through the same rows, each again clear of the Filter button and HUD.
- **Enter or Space** on a row opens it, and again closes it.
- **The Filter button** opens its panel with Enter or Space, and again closes it. With the panel open, Tab goes from the button into it: from box to box, then to Clear filters and the eight eras. Shift+Tab comes back the same way to the button. With the panel shut, Tab from the button goes to the first row.
- **In the panel,** Space ticks a box and the count changes. Escape closes the panel and puts the focus back on the Filter button, with the filter still set.
- **The rotor** (VO-U) lists the title, the eight eras and the cards' titles under Headings, and the eight eras by name under Landmarks. With the panel open it lists "Filter events" and "Jump to an era" as well.
- **Safari's rendering:** every band blends evenly, with no hard edge above or below it (this relies on `linear-gradient(in oklab, …)`), and the spine runs through it unbroken. Every card has its diamond on the spine and a focused row its whole ring: both are drawn outside the event's own box, in the margin that `overflow-clip-margin` allows. Every row's title ends in a small +, the tags have dots between them, and the chapters' layout matches Chrome's.

## Firefox

- Scroll once from top to bottom. The bands blend, the spine is unbroken, the HUD follows, and nothing overlaps.
- Every card has its diamond on the spine, every row's title ends in a small +, and the tags have dots between them.
- Set a filter, copy the address, and open it in a new window. The same events are undimmed, and the Filter button shows the same number.

## What to do with a problem

Note the era, the event or band, the device and the browser, and take a screenshot if you can. Most problems can then be written as a test before they're fixed.
