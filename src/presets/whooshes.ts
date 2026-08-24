import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Whooshes family. Motion rendered as filtered noise: a bandpass sweep is
 * the object cutting through air, the amplitude arc is its pass. Each preset
 * 1:1-mirrors a recording in the curated whooshes set (see mirrors.ts).
 */

export const whooshPresets: SfxRecipe[] = [
  {
    id: "whoosh.swish",
    name: "Whoosh — Swish",
    version: "0.1.0",
    seed: 701,
    taxonomy: { diegesis: "diegetic", function: "movement", event: "whoosh", tags: ["whoosh", "swish", "blade"] },
    perception: { brightness: 0.7, weight: 0.2, roughness: 0.3, tonality: 0.1, urgency: 0.4 },
    education: {
      summary:
        "Mirrors whooshes/swish-short.wav (artisticdude, OGA). A blade cut is a band of noise sweeping up fast: bandpass climbing 800→3000 Hz in under 200 ms with a sharp amplitude arc. Listen for what the recording has that this doesn't — a faint metallic edge from the real blade the pure noise can't supply.",
      claims: [
        { text: "A fast upward spectral sweep reads as an accelerating pass; direction of the sweep sets the sense of approach vs. recede.", basis: "evidence", source: "spectral-motion perception; report §movement" },
        { text: "Short, bright, tonally empty = 'swish' is a learned game-audio shorthand for a light fast object.", basis: "convention" },
      ],
    },
    provenance,
    layers: [
      {
        id: "air",
        source: { kind: "noise", color: "white" },
        durMs: 200,
        ampEnv: { attackMs: 8, decayMs: 180, peak: 0.6, curve: "exp" },
        filter: { type: "bandpass", freqHz: 800, q: 1.2, env: { toHz: 3000, timeMs: 160, curve: "exp" } },
      },
    ],
    master: { gain: 0.85, durMs: 220 },
    variation: { pitchPct: 4, gainDb: 1, timingMs: 2 },
  },
  {
    id: "whoosh.air",
    name: "Whoosh — Air",
    version: "0.1.0",
    seed: 702,
    taxonomy: { diegesis: "diegetic", function: "movement", event: "whoosh", tags: ["whoosh", "air", "pass"] },
    perception: { brightness: 0.5, weight: 0.3, roughness: 0.2, tonality: 0.05, urgency: 0.3 },
    education: {
      summary:
        "Mirrors whooshes/air-whoosh.wav (pyranostudios). A close air pass is two overlapping textures: a brown-noise body sweeping its bandpass up from 300 to 1400 Hz as the object arrives, and a pink-noise hiss riding above 900 Hz as it trails. Listen for what the recording has that this misses — the spatial bloom of the room, which gives the recording a sense of distance the dry synthesis lacks.",
      claims: [
        { text: "Separating the body sweep from the trailing hiss in two layers lets each envelope track the physical event independently — arrival peak on the body, longer tail on the hiss.", basis: "evidence", source: "spectral segregation; report §movement" },
        { text: "Brown noise under a rising bandpass is the standard idiom for a heavy air mass passing close; pink hiss above it adds perceived speed.", basis: "convention" },
      ],
    },
    provenance,
    layers: [
      {
        id: "body",
        source: { kind: "noise", color: "brown" },
        durMs: 720,
        ampEnv: { attackMs: 40, decayMs: 700, peak: 0.6, curve: "exp" },
        filter: { type: "bandpass", freqHz: 300, q: 0.9, env: { toHz: 1400, timeMs: 560, curve: "exp" } },
      },
      {
        id: "hiss",
        source: { kind: "noise", color: "pink" },
        durMs: 720,
        ampEnv: { attackMs: 60, decayMs: 660, peak: 0.25, curve: "exp" },
        filter: { type: "highpass", freqHz: 900 },
      },
    ],
    master: { gain: 0.85, durMs: 760 },
    variation: { pitchPct: 4, gainDb: 1, timingMs: 2 },
  },
  {
    id: "whoosh.wind",
    name: "Whoosh — Wind",
    version: "0.1.0",
    seed: 703,
    taxonomy: { diegesis: "diegetic", function: "movement", event: "whoosh", tags: ["whoosh", "wind", "sustained", "ambient"] },
    perception: { brightness: 0.3, weight: 0.5, roughness: 0.35, tonality: 0.05, urgency: 0.15 },
    education: {
      summary:
        "Mirrors whooshes/wind-whoosh-loop.wav (SketchMan3). Sustained wind is a slow gust with a wandering cutoff: brown noise through a lowpass whose center drifts ±400 Hz at 0.5 Hz, plus a pink-noise air layer whose gain ebbs at 0.35 Hz. Listen for what the recording has that this can't capture — the turbulent irregularity of real wind gusts, where each cycle is slightly different in shape and timing.",
      claims: [
        { text: "Slow filter modulation at 0.3–0.8 Hz is perceived as breathing or gusting — the same rate on amplitude alone produces a tremolo rather than an environmental texture.", basis: "evidence", source: "modulation-rate perception; report §movement" },
        { text: "Layering two LFO rates (0.5 Hz on filter, 0.35 Hz on gain) creates enough phase drift over the loop period that the repetition is not consciously detected.", basis: "convention" },
      ],
    },
    provenance,
    layers: [
      {
        id: "gust",
        source: { kind: "noise", color: "brown" },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.7, curve: "lin" },
        filter: { type: "lowpass", freqHz: 700 },
        lfo: { target: "filter", rateHz: 0.5, depth: 400, shape: "sine" },
      },
      {
        id: "air",
        source: { kind: "noise", color: "pink" },
        durMs: 4000,
        ampEnv: { attackMs: 500, holdMs: 3100, decayMs: 400, peak: 0.3, curve: "lin" },
        lfo: { target: "gain", rateHz: 0.35, depth: 0.4, shape: "sine" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 4, gainDb: 1, timingMs: 2 },
  },
  {
    id: "whoosh.sweep",
    name: "Whoosh — Sweep",
    version: "0.1.0",
    seed: 704,
    taxonomy: { diegesis: "diegetic", function: "movement", event: "whoosh", tags: ["whoosh", "sweep", "riser", "transition"] },
    perception: { brightness: 0.65, weight: 0.25, roughness: 0.25, tonality: 0.1, urgency: 0.5 },
    education: {
      summary:
        "Mirrors whooshes/erase-sweep.wav (Fupi). A UI or transition sweep is a slow riser: pink noise through a bandpass climbing 400→4000 Hz over 900 ms with a symmetric amplitude arc that peaks at midpoint. Listen for what the recording has that this doesn't — a faint tonal shimmer from the eraser material that pure bandpass noise cannot reproduce.",
      claims: [
        { text: "A slow bandpass sweep over 1–2 seconds maps to 'transition' or 'reveal' perceptually; the direction (upward) signals forward motion or progress.", basis: "evidence", source: "spectral motion perception; report §movement" },
        { text: "Pink noise through a resonant bandpass is the conventional source for sweeps and risers — the 1/f spectrum matches the self-noise of real objects better than white noise.", basis: "convention" },
      ],
    },
    provenance,
    layers: [
      {
        id: "riser",
        source: { kind: "noise", color: "pink" },
        durMs: 1180,
        ampEnv: { attackMs: 500, decayMs: 680, peak: 0.6, curve: "exp" },
        filter: { type: "bandpass", freqHz: 400, q: 1.4, env: { toHz: 4000, timeMs: 900, curve: "exp" } },
      },
    ],
    master: { gain: 0.85, durMs: 1200 },
    variation: { pitchPct: 4, gainDb: 1, timingMs: 2 },
  },
];
