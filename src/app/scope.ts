/** Scope playback affordances shared by the lab and library tabs. */

const playingTimeouts = new WeakMap<HTMLElement, number>();

/** Hold the "playing" glow on the scope for the whole audible span. */
export function markPlaying(wrap: HTMLElement, totalMs: number): void {
  wrap.classList.add("is-playing");
  const prev = playingTimeouts.get(wrap);
  if (prev !== undefined) clearTimeout(prev);
  playingTimeouts.set(
    wrap,
    window.setTimeout(() => wrap.classList.remove("is-playing"), totalMs),
  );
}

/**
 * Sweep the cursor across the scope in sync with one playback. The scope
 * x-axis is time (0 → master.durMs), so a linear sweep tracks the waveform
 * underneath it. Reduced-motion users get the border glow only.
 */
export function sweepPlayhead(
  wrap: HTMLElement,
  head: HTMLElement,
  durMs: number,
  delayMs = 0,
): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  head.animate(
    [
      { transform: "translateX(0)", opacity: 1 },
      { transform: `translateX(${wrap.clientWidth - 2}px)`, opacity: 1 },
    ],
    { duration: durMs, delay: delayMs, easing: "linear", fill: "none" },
  );
}
