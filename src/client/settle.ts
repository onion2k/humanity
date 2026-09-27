// Bringing something into view and keeping it there. Events off screen are
// sized by an estimate until they are drawn, so a scroll towards one (a jump
// to an era, or the browser following keyboard focus) can land short or long
// once the events it passes are drawn. These wait, frame by frame and never on
// a timer, until the page is still, then check and put it right.

const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Counts the reader's own moves: a wheel, a touch, a press, or a key other than Tab. A correction that was waiting
 * when the reader moved is dropped, so the page never pulls them back to somewhere they have chosen to leave.
 */
let moves = 0;
for (const type of ["wheel", "touchstart", "pointerdown"] as const) {
  window.addEventListener(type, () => (moves += 1), { passive: true, capture: true });
}
window.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Tab") moves += 1;
  },
  { capture: true },
);

/** Resolves once the page has not scrolled for three frames in a row. */
export async function whenStill(): Promise<void> {
  let still = 0;
  let last = window.scrollY;
  for (let i = 0; i < 600 && still < 3; i++) {
    await frame();
    still = window.scrollY === last ? still + 1 : 0;
    last = window.scrollY;
  }
}

/** The part of the screen that fixed chrome and the edge leave clear, from the page's scroll padding. */
function clearTop(): number {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
}

function clearBottom(): number {
  return (
    window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0)
  );
}

/** Puts a heading at the top of the clear part of the screen, and keeps putting it there until it stays. */
export async function landOn(element: HTMLElement): Promise<void> {
  const before = moves;
  for (let attempt = 0; attempt < 4; attempt++) {
    await whenStill();
    if (moves !== before) return;
    if (Math.abs(element.getBoundingClientRect().top - clearTop()) < 1) return;
    element.scrollIntoView({ behavior: "instant", block: "start" });
  }
}

/**
 * Brings a focused element fully into the clear part of the screen if the browser's scroll to it landed it under
 * the chrome or off the edge. It only puts right a near miss: an element more than a screen away is somewhere the
 * page was taken on purpose since, and is left alone.
 */
export async function keepInView(element: HTMLElement): Promise<void> {
  const before = moves;
  for (let attempt = 0; attempt < 4; attempt++) {
    await whenStill();
    if (moves !== before || document.activeElement !== element) return;
    const box = element.getBoundingClientRect();
    if (box.top >= clearTop() - 0.5 && box.bottom <= clearBottom() + 0.5) return;
    if (box.bottom < -window.innerHeight || box.top > 2 * window.innerHeight) return;
    element.scrollIntoView({ behavior: "instant", block: "nearest" });
  }
}
