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
  /** The seam the engine is blending, read back from what it wrote on the page. */
  seam: SeamState | null;
  /** The filter as the boxes are ticked, the events it dims, what the count says, and whether the panel is open. */
  filter: Filter;
  dimmed: string[];
  count: string;
  panelOpen: boolean;
}

export interface SeamState {
  index: number;
  pc: number;
  pi: number;
  /** The stage's skin, which switches at the midpoint, and its drawn background as #rrggbb. */
  theme: EraId | null;
  background: string;
  /** Every piece of text on the stage with its drawn colour and opacity. */
  text: { layer: string; colour: string; opacity: number }[];
}

export interface TestApi {
  /** Scrolls so the event's top is `offset` pixels below the top of the viewport, and returns once it has stopped moving. */
  scrollToEvent(id: string, offset?: number): Promise<void>;
  /** Scrolls so the era's chapter starts at the top of the viewport. */
  scrollToEra(id: EraId): Promise<void>;
  /**
   * Scrolls so the middle of the viewport is this far through the seam after the chapter at this index: 0 at its
   * top, 1 at its bottom. This is the engine's own measure, so 0.5 is the seam's midpoint.
   */
  scrollToSeam(index: number, progress: number): Promise<void>;
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
