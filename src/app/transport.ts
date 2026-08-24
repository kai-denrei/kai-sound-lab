import type { Voice } from "../lib";

/**
 * Live-playback registry shared across tabs (one AudioContext). STOP calls
 * stopAll(); voices also auto-deregister when they end naturally, so a set
 * membership never outlives its sound by more than ~100ms.
 */

const active = new Set<Voice>();

export function addVoice(v: Voice, durationMs: number): void {
  active.add(v);
  // bare setTimeout (global): the test env is node (no `window`), and in the
  // browser the global timer is fine too.
  setTimeout(() => active.delete(v), durationMs + 100);
}

export function stopAll(): void {
  for (const v of active) {
    try { v.stop(); } catch { /* already gone */ }
  }
  active.clear();
}

export function activeCount(): number {
  return active.size;
}
