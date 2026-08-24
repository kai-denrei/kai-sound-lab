/**
 * Deterministic seeded PRNG (mulberry32).
 * The whole library's reproducibility promise — same recipe + same seed =
 * same sound — hangs on every random choice flowing through this.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform in [-1, 1). */
export function bipolar(rng: Rng): number {
  return rng() * 2 - 1;
}

/**
 * Derive a sub-seed so independent consumers (e.g. per-layer noise buffers)
 * don't share a stream and silently correlate.
 */
export function deriveSeed(seed: number, salt: number): number {
  const rng = mulberry32((seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0);
  return Math.floor(rng() * 0xffffffff) >>> 0;
}
