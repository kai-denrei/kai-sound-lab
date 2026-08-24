import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Impacts & FX family: explosions, ordnance, gore. The explosion anatomy is
 * the report's recipe verbatim — broadband blast, falling low body, driven
 * debris noise with a collapsing lowpass. Distance is expressed by removing
 * the transient and the highs, not by lowering volume.
 */

export const fxPresets: SfxRecipe[] = [
  {
    id: "fx.explosion-close",
    name: "Explosion — Close",
    version: "0.1.0",
    seed: 401,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "explosion",
      tags: ["explosion", "ordnance", "large"],
    },
    perception: { brightness: 0.55, weight: 0.9, roughness: 0.7, tonality: 0.05, urgency: 0.7 },
    education: {
      summary:
        "Four stages: a saturated broadband blast marks the instant, a sine body falls from 110 to 32 Hz for mass, driven pink-noise debris decays for most of a second while its lowpass collapses, and a mid-band crackle layer arrives 80 ms late like secondary debris.",
      claims: [
        {
          text: "An evolving noise tail (moving filter, staged layers) prevents the 'synth note' problem — a static spectrum reads as a tone, not an event aftermath.",
          basis: "evidence",
          source: "Report explosion recipe; spectral evolution in environmental sounds",
        },
        {
          text: "Real explosions are one sharp overpressure pop; the long cinematic rumble is a film convention players now expect. This recipe deliberately synthesizes the convention, not the physics.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "blast",
        source: { kind: "noise", color: "white" },
        durMs: 40,
        ampEnv: { attackMs: 1, decayMs: 36, peak: 0.95, curve: "exp" },
        drive: 1.0,
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 110 },
        durMs: 550,
        ampEnv: { attackMs: 2, decayMs: 520, peak: 0.8, curve: "exp" },
        pitchEnv: { toHz: 32, timeMs: 250, curve: "exp" },
      },
      {
        id: "debris",
        source: { kind: "noise", color: "pink" },
        durMs: 950,
        ampEnv: { attackMs: 5, decayMs: 900, peak: 0.5, curve: "exp" },
        filter: { type: "lowpass", freqHz: 3000, q: 0.7, env: { toHz: 350, timeMs: 800, curve: "exp" } },
        drive: 0.4,
      },
      {
        id: "crackle",
        source: { kind: "noise", color: "white" },
        delayMs: 80,
        durMs: 220,
        ampEnv: { attackMs: 4, decayMs: 200, peak: 0.2, curve: "exp" },
        filter: { type: "bandpass", freqHz: 1800, q: 1 },
      },
    ],
    master: { gain: 0.7, durMs: 1200 },
    variation: { pitchPct: 5, gainDb: 1.5, timingMs: 6 },
  },
  {
    id: "fx.explosion-distant",
    name: "Explosion — Distant",
    version: "0.1.0",
    seed: 402,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "explosion-far",
      tags: ["explosion", "distant", "ambience-adjacent"],
    },
    perception: { brightness: 0.1, weight: 0.7, roughness: 0.3, tonality: 0.1, urgency: 0.3 },
    education: {
      summary:
        "The same event a kilometer away: no crack at all — a soft dull thud, then brown-noise rumble whose lowpass sinks from 300 to 120 Hz. Distance is subtraction: the transient and the highs are what the air ate.",
      claims: [
        {
          text: "High-frequency attenuation over distance is straight acoustics — air absorption rises with frequency — which is why 'dull' reliably reads as 'far' without any level change.",
          basis: "evidence",
          source: "Atmospheric absorption; report distance mapping",
        },
        {
          text: "Preserving audibility at low level (rather than realistic near-silence) is a game-mix convention: distant battle is information, and information must survive the mix.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "thud",
        source: { kind: "noise", color: "white" },
        durMs: 60,
        ampEnv: { attackMs: 8, decayMs: 50, peak: 0.5, curve: "exp" },
        filter: { type: "lowpass", freqHz: 500, q: 0.7 },
      },
      {
        id: "rumble",
        source: { kind: "noise", color: "brown" },
        durMs: 850,
        ampEnv: { attackMs: 30, decayMs: 800, peak: 0.7, curve: "exp" },
        filter: { type: "lowpass", freqHz: 300, q: 0.7, env: { toHz: 120, timeMs: 700, curve: "exp" } },
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 70 },
        durMs: 550,
        ampEnv: { attackMs: 10, decayMs: 520, peak: 0.4, curve: "exp" },
        pitchEnv: { toHz: 35, timeMs: 400, curve: "exp" },
      },
    ],
    master: { gain: 0.8, durMs: 1000 },
    variation: { pitchPct: 6, gainDb: 2, timingMs: 10 },
  },
  {
    id: "fx.mortar-launch",
    name: "Mortar — Launch",
    version: "0.1.0",
    seed: 403,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "launch",
      tags: ["mortar", "ordnance", "tube"],
    },
    perception: { brightness: 0.25, weight: 0.6, roughness: 0.25, tonality: 0.35, urgency: 0.35 },
    education: {
      summary:
        "The hollow 'thoonk': a tube-resonance sweep from 220 down to 95 Hz, a bandpassed hollow pop, and a ground thump. The falling tube tone is what separates 'launched from a tube' from 'generic explosion' — pair it with fx.explosion-distant a few seconds later and the ear invents the shell's flight.",
      claims: [
        {
          text: "Listeners infer cause from a few selected cues — a resonant falling tone over a thump is enough to read 'tube launch' with no air whistle, no shell, no physics.",
          basis: "evidence",
          source: "Causal inference from acoustic cues (material/event perception research)",
        },
        {
          text: "The launch–silence–distant-boom sequence is a temporal narrative convention: the sound design implies the projectile the game never renders.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "tube",
        source: { kind: "osc", type: "sine", freqHz: 220 },
        durMs: 220,
        ampEnv: { attackMs: 2, decayMs: 200, peak: 0.6, curve: "exp" },
        pitchEnv: { toHz: 95, timeMs: 80, curve: "exp" },
      },
      {
        id: "pop",
        source: { kind: "noise", color: "pink" },
        durMs: 160,
        ampEnv: { attackMs: 2, decayMs: 140, peak: 0.4, curve: "exp" },
        filter: { type: "bandpass", freqHz: 300, q: 2 },
        drive: 0.3,
      },
      {
        id: "thump",
        source: { kind: "osc", type: "sine", freqHz: 85 },
        durMs: 150,
        ampEnv: { attackMs: 1, decayMs: 130, peak: 0.5, curve: "exp" },
      },
    ],
    master: { gain: 0.85, durMs: 350 },
    variation: { pitchPct: 5, gainDb: 1.5, timingMs: 5 },
  },
  {
    id: "fx.splat-gore",
    name: "Splat — Gore",
    version: "0.1.0",
    seed: 404,
    taxonomy: {
      diegesis: "diegetic",
      function: "impact",
      event: "squash-organic",
      tags: ["gore", "wet", "organic", "monster"],
    },
    perception: { brightness: 0.3, weight: 0.55, roughness: 0.4, tonality: 0.1, urgency: 0.3 },
    education: {
      summary:
        "Monster-under-wheels: a driven wet impact whose lowpass slams shut, three squish blips stepping downward in frequency (30/70/115 ms — the irregular spacing is the 'organic'), a body thud, and a small droplet tail. Wet = noise with fast downward spectral motion.",
      claims: [
        {
          text: "Irregular micro-event timing reads as organic/chaotic where regular spacing reads as mechanical — the same stochastic-texture principle behind water and electricity synthesis.",
          basis: "evidence",
          source: "Report: stochastic micro-events for liquid textures",
        },
        {
          text: "Comedy-gore (bright squish, quick decay, no scream) versus horror-gore (longer, lower, wetter) is entirely a tuning convention on the same recipe — this preset sits at the cartoon end on purpose.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "impact",
        source: { kind: "noise", color: "brown" },
        durMs: 90,
        ampEnv: { attackMs: 1, decayMs: 80, peak: 0.7, curve: "exp" },
        filter: { type: "lowpass", freqHz: 1400, q: 0.9, env: { toHz: 300, timeMs: 100, curve: "exp" } },
        drive: 0.3,
      },
      {
        id: "squish1",
        source: { kind: "noise", color: "pink" },
        delayMs: 30,
        durMs: 40,
        ampEnv: { attackMs: 2, decayMs: 34, peak: 0.3, curve: "exp" },
        filter: { type: "bandpass", freqHz: 700, q: 2 },
      },
      {
        id: "squish2",
        source: { kind: "noise", color: "pink" },
        delayMs: 70,
        durMs: 40,
        ampEnv: { attackMs: 2, decayMs: 34, peak: 0.25, curve: "exp" },
        filter: { type: "bandpass", freqHz: 550, q: 2 },
      },
      {
        id: "squish3",
        source: { kind: "noise", color: "pink" },
        delayMs: 115,
        durMs: 45,
        ampEnv: { attackMs: 2, decayMs: 38, peak: 0.2, curve: "exp" },
        filter: { type: "bandpass", freqHz: 420, q: 2 },
      },
      {
        id: "thud",
        source: { kind: "osc", type: "sine", freqHz: 120 },
        durMs: 120,
        ampEnv: { attackMs: 1, decayMs: 110, peak: 0.5, curve: "exp" },
        pitchEnv: { toHz: 55, timeMs: 60, curve: "exp" },
      },
      {
        id: "droplets",
        source: { kind: "noise", color: "pink" },
        delayMs: 140,
        durMs: 200,
        ampEnv: { attackMs: 10, decayMs: 180, peak: 0.12, curve: "exp" },
        filter: { type: "bandpass", freqHz: 900, q: 3 },
      },
    ],
    master: { gain: 0.85, durMs: 420 },
    variation: { pitchPct: 8, gainDb: 2, timingMs: 8 },
  },
];
