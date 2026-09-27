// window.__pw: the handle Playwright holds the page by, in test builds only.
// A test sets the scroll position through it and reads back what the reader
// would see, so no test ever waits on a timeout or guesses at a pixel offset.
import type { Filter } from "../engine/filter.ts";
import type { EraId } from "../eras.ts";

export interface PageState {
  scrollY: number;
  viewportHeight: number;
  /** The era whose skin is under the top of the viewport. */
  eraAtTop: EraId | null;
  /** The ids of the rows that are open, in page order. */
  openRows: string[];
  eventCount: number;
  /**
   * Drawn blocks that reach past either side of the viewport. A chapter clips what overflows it rather than letting
   * the page scroll sideways, so the page's own scroll width cannot show this.
   */
  overflowing: string[];
  /** The HUD as drawn: its year, the era name showing most strongly, and the skin it wears. */
  hud: { year: string; era: string; theme: EraId | null } | null;
  /** The filter as the boxes are ticked, the events it dims, what the count says, and whether the panel is open. */
  filter: Filter;
  dimmed: string[];
  count: string;
  panelOpen: boolean;
  /** The era art drawn on screen, read from the page: whose it is, which piece, and where it lies. */
  art: DrawnArt[];
}

export interface DrawnArt {
  era: EraId;
  part: "left" | "right" | "emblem";
  rect: { left: number; top: number; right: number; bottom: number };
}

export interface TestApi {
  /** Scrolls so the event's top is `offset` pixels below the top of the viewport, and returns once it has stopped moving. */
  scrollToEvent(id: string, offset?: number): Promise<void>;
  /** Scrolls so the era's chapter starts at the top of the viewport. */
  scrollToEra(id: EraId): Promise<void>;
  /** Scrolls so the middle of the viewport is this far through the band after the chapter at this index, 0 to 1. */
  scrollToBand(index: number, progress: number): Promise<void>;
  scrollToY(y: number): Promise<void>;
  /** Steps frames until the page has stopped scrolling, as after a keyboard scroll, and any fonts in flight are in. */
  settle(): Promise<void>;
  /** Ticks exactly these boxes, as a reader would, and returns once the page has applied them. */
  setFilter(filter: Filter): Promise<void>;
  state(): PageState;
}

declare global {
  interface Window {
    __pw?: TestApi;
  }
}
