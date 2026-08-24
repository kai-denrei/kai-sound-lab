import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Melee & Materials family. One anatomy for every impact — contact
 * transient + body thump + modal resonance + texture — where the material
 * is carried almost entirely by the modes:
 *
 *   metal: inharmonic ratios (1.0/1.47/2.13/3.82/5.19), LONG unequal decays
 *   wood:  near-harmonic low modes, heavy damping (30–60 ms)
 *   stone: sparse high modes, extreme damping (<25 ms), gritty noise
 *   flesh: almost no modes — noise with fast downward spectral motion
 *
 * Materials are data, not code: no preset here needed a new primitive.
 */

const METAL_RATIOS = [1.0, 1.47, 2.13, 3.82, 5.19];

export const meleePresets: SfxRecipe[] = [
  {
    id: "melee.sword-clash",
    name: "Sword Clash",
    version: "0.1.0",
    seed: 501,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "blade-on-blade",
      tags: ["melee", "metal", "sword"],
    },
    perception: { brightness: 0.75, weight: 0.4, roughness: 0.35, tonality: 0.55, urgency: 0.45 },
    education: {
      summary:
        "Blade on blade: a hard high transient excites five inharmonic modes (base 1120 Hz × the report's metal ratios) whose decays fall from 350 to 100 ms — long and unequal, which is the entire 'metal' signature — plus a high scrape as the edges slide.",
      claims: [
        {
          text: "Listeners identify material chiefly from modal frequency ratios and decay times; inharmonic, slowly and unequally decaying modes are reliably heard as metal. This preset is that finding, directly parameterized.",
          basis: "evidence",
          source: "Modal impact synthesis & auditory material perception research",
        },
        {
          text: "The scrape layer (high-passed noise, ~120 ms) is causal storytelling — it implies the blades sliding after contact, which no mode can express.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 8,
        ampEnv: { attackMs: 1, decayMs: 6, peak: 0.6, curve: "exp" },
        filter: { type: "highpass", freqHz: 3000, q: 0.7 },
        drive: 0.3,
      },
      ...METAL_RATIOS.map((ratio, i) => ({
        id: `mode${i + 1}`,
        source: { kind: "osc", type: "sine", freqHz: Math.round(1120 * ratio) } as const,
        durMs: 380 - i * 65,
        ampEnv: {
          attackMs: 1,
          decayMs: 350 - i * 62,
          peak: 0.15 * Math.pow(0.72, i),
          curve: "exp" as const,
        },
      })),
      {
        id: "scrape",
        source: { kind: "noise", color: "white" },
        durMs: 130,
        ampEnv: { attackMs: 2, decayMs: 120, peak: 0.12, curve: "exp" },
        filter: { type: "highpass", freqHz: 4500, q: 0.7 },
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 220 },
        durMs: 70,
        ampEnv: { attackMs: 1, decayMs: 60, peak: 0.2, curve: "exp" },
      },
    ],
    master: { gain: 0.85, durMs: 480 },
    variation: { pitchPct: 5, gainDb: 1.5, timingMs: 3 },
  },
  {
    id: "melee.mace-wood",
    name: "Mace — Wood",
    version: "0.1.0",
    seed: 502,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "blunt-on-wood",
      tags: ["melee", "wood", "mace", "shield"],
    },
    perception: { brightness: 0.35, weight: 0.6, roughness: 0.2, tonality: 0.35, urgency: 0.3 },
    education: {
      summary:
        "Mace into a wooden shield: dulled contact, a deep thump, three near-harmonic modes (380/620/940 Hz) killed inside 60 ms, and a short crack of splintering. Wood is the anti-metal — the modes exist, but the damping eats them almost immediately.",
      claims: [
        {
          text: "Heavy damping — few modes, short decays — is the acoustic signature of wood in material-perception studies; the difference between this and the sword clash is almost entirely decay time.",
          basis: "evidence",
          source: "Report cheat sheet: wooden = few strongly damped resonances + short contact",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 10,
        ampEnv: { attackMs: 1, decayMs: 8, peak: 0.6, curve: "exp" },
        filter: { type: "lowpass", freqHz: 3500, q: 0.7 },
        drive: 0.2,
      },
      {
        id: "thump",
        source: { kind: "osc", type: "sine", freqHz: 130 },
        durMs: 120,
        ampEnv: { attackMs: 1, decayMs: 110, peak: 0.6, curve: "exp" },
        pitchEnv: { toHz: 75, timeMs: 40, curve: "exp" },
      },
      {
        id: "mode1",
        source: { kind: "osc", type: "sine", freqHz: 380 },
        durMs: 62,
        ampEnv: { attackMs: 1, decayMs: 55, peak: 0.25, curve: "exp" },
      },
      {
        id: "mode2",
        source: { kind: "osc", type: "sine", freqHz: 620 },
        durMs: 52,
        ampEnv: { attackMs: 1, decayMs: 45, peak: 0.15, curve: "exp" },
      },
      {
        id: "mode3",
        source: { kind: "osc", type: "sine", freqHz: 940 },
        durMs: 42,
        ampEnv: { attackMs: 1, decayMs: 35, peak: 0.08, curve: "exp" },
      },
      {
        id: "crack",
        source: { kind: "noise", color: "white" },
        durMs: 28,
        ampEnv: { attackMs: 1, decayMs: 24, peak: 0.3, curve: "exp" },
        filter: { type: "bandpass", freqHz: 1500, q: 1.5 },
      },
    ],
    master: { gain: 0.9, durMs: 260 },
    variation: { pitchPct: 6, gainDb: 1.8, timingMs: 4 },
  },
  {
    id: "melee.mace-stone",
    name: "Mace — Stone",
    version: "0.1.0",
    seed: 503,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "blunt-on-stone",
      tags: ["melee", "stone", "mace", "masonry"],
    },
    perception: { brightness: 0.55, weight: 0.65, roughness: 0.4, tonality: 0.15, urgency: 0.35 },
    education: {
      summary:
        "Mace on masonry: an even harder, driven contact, two barely-ringing high modes gone within 25 ms, a gritty crumble whose bandpass slides downward, and late debris. Stone is mostly noise — its 'tone' is the texture of fracture, not resonance.",
      claims: [
        {
          text: "Extreme damping plus broadband fracture noise distinguishes stone/ceramic from wood and metal — as modal decay approaches zero, material identity migrates from the resonance into the noise texture.",
          basis: "evidence",
          source: "Auditory material perception (damping continuum)",
        },
        {
          text: "The delayed debris layer implies rubble falling — a causal-narrative convention, same trick as the sword scrape and the explosion crackle.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 8,
        ampEnv: { attackMs: 1, decayMs: 7, peak: 0.7, curve: "exp" },
        drive: 0.4,
      },
      {
        id: "grit",
        source: { kind: "noise", color: "white" },
        durMs: 100,
        ampEnv: { attackMs: 1, decayMs: 90, peak: 0.35, curve: "exp" },
        filter: { type: "bandpass", freqHz: 2200, q: 1, env: { toHz: 1200, timeMs: 90, curve: "exp" } },
      },
      {
        id: "mode1",
        source: { kind: "osc", type: "sine", freqHz: 1300 },
        durMs: 30,
        ampEnv: { attackMs: 1, decayMs: 24, peak: 0.12, curve: "exp" },
      },
      {
        id: "mode2",
        source: { kind: "osc", type: "sine", freqHz: 2100 },
        durMs: 24,
        ampEnv: { attackMs: 1, decayMs: 18, peak: 0.08, curve: "exp" },
      },
      {
        id: "thud",
        source: { kind: "osc", type: "sine", freqHz: 100 },
        durMs: 150,
        ampEnv: { attackMs: 1, decayMs: 135, peak: 0.55, curve: "exp" },
        pitchEnv: { toHz: 60, timeMs: 50, curve: "exp" },
      },
      {
        id: "debris",
        source: { kind: "noise", color: "pink" },
        delayMs: 60,
        durMs: 160,
        ampEnv: { attackMs: 8, decayMs: 145, peak: 0.12, curve: "exp" },
        filter: { type: "bandpass", freqHz: 1000, q: 2 },
      },
    ],
    master: { gain: 0.85, durMs: 320 },
    variation: { pitchPct: 6, gainDb: 1.8, timingMs: 5 },
  },
  {
    id: "melee.mace-metal",
    name: "Mace — Armor",
    version: "0.1.0",
    seed: 504,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "blunt-on-metal",
      tags: ["melee", "metal", "mace", "armor"],
    },
    perception: { brightness: 0.55, weight: 0.7, roughness: 0.3, tonality: 0.5, urgency: 0.4 },
    education: {
      summary:
        "Mace on plate armor: the sword clash's inharmonic ratios transposed down to a 480 Hz base — a big plate rings lower and longer than a blade — under a driven contact and a heavy body thump. Same material law, different object size.",
      claims: [
        {
          text: "Resonant frequency falls with object size while the material's mode-ratio fingerprint persists — which is why armor and blade are audibly both 'metal' yet audibly different objects.",
          basis: "evidence",
          source: "Report mapping: size → inverse resonant frequency; material → mode ratios",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "contact",
        source: { kind: "noise", color: "white" },
        durMs: 7,
        ampEnv: { attackMs: 1, decayMs: 6, peak: 0.7, curve: "exp" },
        filter: { type: "highpass", freqHz: 2000, q: 0.7 },
        drive: 0.5,
      },
      ...[0, 1, 2, 3].map((i) => ({
        id: `mode${i + 1}`,
        source: {
          kind: "osc",
          type: "sine",
          freqHz: Math.round(480 * METAL_RATIOS[i]),
        } as const,
        durMs: 440 - i * 90,
        ampEnv: {
          attackMs: 1,
          decayMs: 410 - i * 88,
          peak: 0.28 * Math.pow(0.68, i),
          curve: "exp" as const,
        },
      })),
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 140 },
        durMs: 120,
        ampEnv: { attackMs: 1, decayMs: 105, peak: 0.5, curve: "exp" },
        pitchEnv: { toHz: 85, timeMs: 45, curve: "exp" },
      },
    ],
    master: { gain: 0.85, durMs: 550 },
    variation: { pitchPct: 5, gainDb: 1.5, timingMs: 3 },
  },
  {
    id: "melee.mace-flesh",
    name: "Mace — Flesh",
    version: "0.1.0",
    seed: 505,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "blunt-on-flesh",
      tags: ["melee", "flesh", "mace", "organic"],
    },
    perception: { brightness: 0.2, weight: 0.6, roughness: 0.25, tonality: 0.1, urgency: 0.35 },
    education: {
      summary:
        "The blunt hit on a body: a dull bone knock, a driven wet impact whose lowpass slams shut, a deep body drop, and one late squish. Flesh is the far end of the damping continuum — effectively zero resonance, so identity lives entirely in the noise's spectral motion.",
      claims: [
        {
          text: "As damping goes to its extreme, material identity is carried by noise texture and its filter trajectory rather than resonance — 'wet' is fast downward spectral motion, not a spectrum.",
          basis: "evidence",
          source: "Damping continuum; report liquid-texture principle",
        },
        {
          text: "The faint bone knock (a single dulled tick) is what separates 'hit a body' from 'hit a sandbag' — one small causal cue recruits the whole interpretation.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "knock",
        source: { kind: "noise", color: "white" },
        durMs: 6,
        ampEnv: { attackMs: 1, decayMs: 5, peak: 0.35, curve: "exp" },
        filter: { type: "lowpass", freqHz: 1800, q: 0.8 },
      },
      {
        id: "impact",
        source: { kind: "noise", color: "brown" },
        durMs: 80,
        ampEnv: { attackMs: 1, decayMs: 70, peak: 0.7, curve: "exp" },
        filter: { type: "lowpass", freqHz: 900, q: 0.9, env: { toHz: 250, timeMs: 80, curve: "exp" } },
        drive: 0.3,
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 110 },
        durMs: 140,
        ampEnv: { attackMs: 1, decayMs: 125, peak: 0.6, curve: "exp" },
        pitchEnv: { toHz: 50, timeMs: 60, curve: "exp" },
      },
      {
        id: "squish",
        source: { kind: "noise", color: "pink" },
        delayMs: 40,
        durMs: 55,
        ampEnv: { attackMs: 2, decayMs: 48, peak: 0.2, curve: "exp" },
        filter: { type: "bandpass", freqHz: 500, q: 2 },
      },
    ],
    master: { gain: 0.9, durMs: 280 },
    variation: { pitchPct: 7, gainDb: 2, timingMs: 5 },
  },
];
