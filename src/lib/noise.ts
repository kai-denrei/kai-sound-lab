import { mulberry32, bipolar } from "./prng";
import type { NoiseColor } from "./recipe";

/**
 * Deterministic noise buffers. Web Audio has no noise node, and any
 * `Math.random()`-filled buffer would break the recipe+seed reproducibility
 * promise — so noise is always generated from the seeded PRNG.
 *
 * Pink: Paul Kellet's economy filter. Brown: leaky integrator of white.
 *
 * Gain note: the commonly circulated Kellet snippet scales by 0.25, which
 * measurably clips (observed peak 1.89 across 50 seeds × 1s). We scale to
 * 0.11 and hard-clamp as a contract: output is always within [-1, 1].
 */
export function generateNoise(
  color: NoiseColor,
  frames: number,
  seed: number,
): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(frames);

  if (color === "white") {
    for (let i = 0; i < frames; i++) out[i] = bipolar(rng);
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < frames; i++) {
      const w = bipolar(rng);
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
  } else {
    let acc = 0;
    for (let i = 0; i < frames; i++) {
      acc = (acc + 0.02 * bipolar(rng)) / 1.02;
      out[i] = acc * 3.5;
    }
  }
  for (let i = 0; i < frames; i++)
    out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}
