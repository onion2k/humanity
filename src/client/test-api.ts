// window.__pw: the handle Playwright holds the page by, in test builds only.
// A test sets the scroll position through it and reads back what the reader
// would see, so no test ever waits on a timeout or guesses at a pixel offset.
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
}

export interface TestApi {
  /** Scrolls so the event's top is at the top of the viewport, and returns once it has stopped moving. */
  scrollToEvent(id: string): Promise<void>;
  /** Scrolls so the era's chapter starts at the top of the viewport. */
  scrollToEra(id: EraId): Promise<void>;
  /** Scrolls to a point through the seam that follows the chapter at this index: 0 at its top, 1 at its bottom. */
  scrollToSeam(index: number, progress: number): Promise<void>;
  scrollToY(y: number): Promise<void>;
  state(): PageState;
}

declare global {
  interface Window {
    __pw?: TestApi;
  }
}
