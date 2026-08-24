import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Mechanical family: physical switchgear. The core trick throughout is the
 * modal insight — a sine layer with a fast attack and exponential decay IS a
 * damped resonator mode, so "metallic" is just several inharmonic sine
 * layers with unequal decay times. No new engine primitive required.
 */

export const mechPresets: SfxRecipe[] = [
  {
    id: "mech.switch-heavy",
    name: "Aircraft Switch",
    version: "0.1.0",
    seed: 201,
    taxonomy: {
      diegesis: "diegetic",
      function: "mechanism",
      event: "toggle-heavy",
      tags: ["mechanical", "metal", "cockpit"],
    },
    perception: { brightness: 0.6, weight: 0.55, roughness: 0.2, tonality: 0.45, urgency: 0.2 },
    education: {
      summary:
        "A guarded-toggle clack: hard broadband contact, a low mechanical thunk, then a short inharmonic metal ring as the spring seats the bat. The second, quieter contact 35 ms later is what sells 'machine' rather than 'tick'.",
      claims: [
        {
          text: "Inharmonic partials with unequal decay times are the acoustic signature of metal — modal impact synthesis research builds material identity from exactly these mode distributions.",
          basis: "evidence",
          source: "Modal impact synthesis (Microsoft Research / material-perception studies)",
        },
        {
          text: "Double transients (strike + seat) read as mechanism; single transients read as abstract UI. This is a causal-inference convention exploited by hardware sound design.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 14,
        ampEnv: { attackMs: 1, decayMs: 12, peak: 0.7, curve: "exp" },
        filter: { type: "highpass", freqHz: 1200, q: 0.7 },
        drive: 0.4,
      },
      {
        id: "thunk",
        source: { kind: "osc", type: "sine", freqHz: 150 },
        durMs: 80,
        ampEnv: { attackMs: 1, decayMs: 70, peak: 0.55, curve: "exp" },
        pitchEnv: { toHz: 92, timeMs: 30, curve: "exp" },
      },
      {
        id: "mode1",
        source: { kind: "osc", type: "sine", freqHz: 1560 },
        durMs: 110,
        ampEnv: { attackMs: 1, decayMs: 100, peak: 0.16, curve: "exp" },
      },
      {
        id: "mode2",
        source: { kind: "osc", type: "sine", freqHz: 2470 },
        durMs: 75,
        ampEnv: { attackMs: 1, decayMs: 65, peak: 0.11, curve: "exp" },
      },
      {
        id: "mode3",
        source: { kind: "osc", type: "sine", freqHz: 3890 },
        durMs: 50,
        ampEnv: { attackMs: 1, decayMs: 42, peak: 0.07, curve: "exp" },
      },
      {
        id: "seat",
        source: { kind: "noise", color: "white" },
        delayMs: 35,
        durMs: 10,
        ampEnv: { attackMs: 1, decayMs: 8, peak: 0.4, curve: "exp" },
        filter: { type: "bandpass", freqHz: 3000, q: 2 },
      },
    ],
    master: { gain: 0.95, durMs: 240 },
    variation: { pitchPct: 4, gainDb: 1.5, timingMs: 4 },
  },
  {
    id: "mech.key-tactile",
    name: "Key — Tactile",
    version: "0.1.0",
    seed: 202,
    taxonomy: {
      diegesis: "diegetic",
      function: "mechanism",
      event: "keypress",
      tags: ["mechanical", "keyboard", "thock"],
    },
    perception: { brightness: 0.35, weight: 0.3, roughness: 0.1, tonality: 0.4, urgency: 0.05 },
    education: {
      summary:
        "The 'thock': a low-passed contact, a compact 190 Hz body, and one restrained mid mode. Keyboard enthusiasts chase this profile by damping the case — acoustically, damping means fewer, shorter modes and less high-frequency contact noise.",
      claims: [
        {
          text: "Strong damping (short modal decays, few modes) reads as dense, solid material — the same modal parameters that separate wood from metal in perception studies.",
          basis: "evidence",
          source: "Auditory material perception (modal decay/damping cues)",
        },
        {
          text: "At typing rates this fires 5–10×/s: the preset's variation ranges exist because identical repeats habituate and start to feel synthetic.",
          basis: "evidence",
          source: "Auditory habituation/repetition studies",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 8,
        ampEnv: { attackMs: 1, decayMs: 6, peak: 0.45, curve: "exp" },
        filter: { type: "lowpass", freqHz: 2500, q: 0.7 },
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 190 },
        durMs: 55,
        ampEnv: { attackMs: 1, decayMs: 48, peak: 0.42, curve: "exp" },
      },
      {
        id: "mode",
        source: { kind: "osc", type: "sine", freqHz: 1150 },
        durMs: 40,
        ampEnv: { attackMs: 1, decayMs: 34, peak: 0.1, curve: "exp" },
      },
    ],
    master: { gain: 0.95, durMs: 110 },
    variation: { pitchPct: 4, gainDb: 1.8, timingMs: 3 },
  },
  {
    id: "mech.key-clicky",
    name: "Key — Clicky",
    version: "0.1.0",
    seed: 203,
    taxonomy: {
      diegesis: "diegetic",
      function: "mechanism",
      event: "keypress",
      tags: ["mechanical", "keyboard", "click-bar"],
    },
    perception: { brightness: 0.85, weight: 0.15, roughness: 0.15, tonality: 0.3, urgency: 0.1 },
    education: {
      summary:
        "A blue-switch double click: the jacket release and the click-bar strike 18 ms apart, both narrow and bright, over a small body. The pair is close enough to fuse into one 'crisp' event but far enough to thicken it.",
      claims: [
        {
          text: "Two transients under ~30 ms apart tend to fuse perceptually into a single, richer onset rather than an echo — the gap here is tuned to sit inside that window.",
          basis: "evidence",
          source: "Temporal integration/fusion research",
        },
        {
          text: "High-Q bandpass noise reads as 'plastic click' where a pure tone would read as 'beep' — noisiness vs tonality carries the material story.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "jacket",
        source: { kind: "noise", color: "white" },
        durMs: 8,
        ampEnv: { attackMs: 1, decayMs: 6, peak: 0.5, curve: "exp" },
        filter: { type: "bandpass", freqHz: 4200, q: 3 },
      },
      {
        id: "clickbar",
        source: { kind: "noise", color: "white" },
        delayMs: 18,
        durMs: 8,
        ampEnv: { attackMs: 1, decayMs: 6, peak: 0.45, curve: "exp" },
        filter: { type: "bandpass", freqHz: 5100, q: 3 },
      },
      {
        id: "ping",
        source: { kind: "osc", type: "sine", freqHz: 3300 },
        delayMs: 18,
        durMs: 32,
        ampEnv: { attackMs: 1, decayMs: 26, peak: 0.08, curve: "exp" },
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 240 },
        durMs: 38,
        ampEnv: { attackMs: 1, decayMs: 32, peak: 0.2, curve: "exp" },
      },
    ],
    master: { gain: 0.95, durMs: 100 },
    variation: { pitchPct: 4, gainDb: 1.8, timingMs: 3 },
  },
];
