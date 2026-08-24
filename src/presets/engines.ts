import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Engines family. Every preset is a named 1:1 mirror of a recording in the
 * curated Engines & Motors set (see src/curated/mirrors.ts). These are the
 * first sustained textures in the library: the LFO primitive carries the
 * periodic movement that separates an engine from a drone.
 */

export const enginePresets: SfxRecipe[] = [
  {
    id: "eng.idle-low",
    name: "Engine — Low Idle",
    version: "0.1.0",
    seed: 602,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "idle", "sustained", "low"],
    },
    perception: { brightness: 0.1, weight: 0.8, roughness: 0.4, tonality: 0.3, urgency: 0.1 },
    education: {
      summary:
        "Mirrors engines/engine-low.wav (Kenney). An idle is a rumble that breathes: brown noise under a 120 Hz lowpass with a slow 1.2 Hz gain LFO, plus two sines at 52 and 54.5 Hz whose 2.5 Hz beating supplies the cyclic throb without any LFO at all. Listen for the recording's irregularity — its firing pulses jitter slightly in time, where these two sines beat with metronomic evenness.",
      claims: [
        {
          text: "Slow amplitude fluctuation around 1–4 Hz is heard as breathing or idling rather than roughness — the same modulation cue shifts percept entirely with rate.",
          basis: "evidence",
          source: "Modulation-rate perception; report §engines",
        },
        {
          text: "Beating two close sines is the cheap idiom for engine throb: one parameter (the detune) sets the firing rate, and it never phases like a looped sample.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "rumble",
        source: { kind: "noise", color: "brown" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.8, curve: "lin" },
        filter: { type: "lowpass", freqHz: 120 },
        lfo: { target: "gain", rateHz: 1.2, depth: 0.5, shape: "sine" },
      },
      {
        id: "fund",
        source: { kind: "osc", type: "sine", freqHz: 52 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.25, curve: "lin" },
      },
      {
        id: "beat",
        source: { kind: "osc", type: "sine", freqHz: 54.5 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.25, curve: "lin" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  {
    id: "eng.circular",
    name: "Engine — Circular",
    version: "0.1.0",
    seed: 601,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "scifi", "sustained", "rotary"],
    },
    perception: { brightness: 0.45, weight: 0.55, roughness: 0.6, tonality: 0.35, urgency: 0.2 },
    education: {
      summary:
        "Mirrors engines/engine-circular.wav (Kenney). The recording reads as 'rotating machine' because one band of noise swells and recedes about five times a second. Here that is literal: a 4.5 Hz sine LFO on a bandpassed pink-noise layer. Listen for what the recording has that this chases — its sweep is asymmetric (fast rise, slow fall), where a sine LFO is symmetric.",
      claims: [
        {
          text: "Periodic amplitude modulation at 3–8 Hz is heard as mechanical rotation; the same spectrum without modulation reads as a static drone.",
          basis: "evidence",
          source: "AM/roughness perception; report §engines",
        },
        {
          text: "A tonal core an octave-ish below the noise band 'motorizes' the texture — pure noise modulation alone reads as wind or waves.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "swoosh",
        source: { kind: "noise", color: "pink" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.7, curve: "lin" },
        filter: { type: "bandpass", freqHz: 900, q: 2 },
        lfo: { target: "gain", rateHz: 4.5, depth: 0.85, shape: "sine" },
      },
      {
        id: "core",
        source: { kind: "osc", type: "triangle", freqHz: 220 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.2, curve: "lin" },
        filter: { type: "lowpass", freqHz: 1200 },
        lfo: { target: "freq", rateHz: 4.5, depth: 18, shape: "sine" },
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 70 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.3, curve: "lin" },
        lfo: { target: "gain", rateHz: 4.5, depth: 0.3, shape: "sine" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  {
    id: "eng.thruster",
    name: "Engine — Thruster",
    version: "0.1.0",
    seed: 603,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "scifi", "thruster", "sustained"],
    },
    perception: { brightness: 0.65, weight: 0.6, roughness: 0.75, tonality: 0.05, urgency: 0.35 },
    education: {
      summary:
        "Mirrors engines/thruster.wav (Kenney). A thruster is all combustion, no pitch: driven white noise fluttering at 27 Hz sits in the roughness band, a bandpassed pink layer drifts slowly up and down the midrange, and brown noise carries the exhaust floor. Listen for the recording's crackle — its turbulence throws discrete pops and snaps that steady-state noise plus an LFO cannot produce.",
      claims: [
        {
          text: "Amplitude modulation in the 15–70 Hz range is perceived as roughness rather than discrete flutter — it fuses into the violent 'ripping' quality of jet and rocket noise.",
          basis: "evidence",
          source: "Roughness psychoacoustics (Zwicker/Fastl); report §engines",
        },
        {
          text: "A slow filter drift over an otherwise static roar is the standard trick for keeping a looping thruster alive — the ear forgives repetition in texture but not in trajectory.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "roar",
        source: { kind: "noise", color: "white" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.6, curve: "lin" },
        filter: { type: "highpass", freqHz: 300 },
        lfo: { target: "gain", rateHz: 27, depth: 0.25, shape: "triangle" },
        drive: 0.6,
      },
      {
        id: "body",
        source: { kind: "noise", color: "pink" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.6, curve: "lin" },
        filter: { type: "bandpass", freqHz: 500, q: 1 },
        lfo: { target: "filter", rateHz: 0.6, depth: 300, shape: "sine" },
      },
      {
        id: "sub",
        source: { kind: "noise", color: "brown" },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.5, curve: "lin" },
        filter: { type: "lowpass", freqHz: 150 },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  {
    id: "eng.space-small",
    name: "Engine — Small Drive",
    version: "0.1.0",
    seed: 604,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "scifi", "drive", "sustained"],
    },
    perception: { brightness: 0.7, weight: 0.3, roughness: 0.45, tonality: 0.6, urgency: 0.25 },
    education: {
      summary:
        "Mirrors engines/space-small.wav (Kenney). Small craft read as whine: a driven square through a resonant bandpass whose center slowly sweeps, a second square carrying a 6 Hz pitch wobble (each layer gets exactly one LFO, so the wobble lives on its own layer), and a filtered noise bed shimmering at the same 6 Hz. Listen for how the recording's whine and wobble are one voice — here they are two squares that never quite fuse.",
      claims: [
        {
          text: "Small sound sources sit higher in frequency: the size–pitch mapping is one of the most robust cross-modal correspondences, so a small drive whines where a large one growls.",
          basis: "evidence",
          source: "Report: size/mass mapping (resonant frequency scales inversely with size)",
        },
        {
          text: "A slight, continuous pitch wobble is how sci-fi audio says 'energy field under strain' — perfectly stable pitch reads as a test tone, not a machine.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "whine",
        source: { kind: "osc", type: "square", freqHz: 640 },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.3, curve: "lin" },
        filter: { type: "bandpass", freqHz: 1400, q: 3 },
        lfo: { target: "filter", rateHz: 0.8, depth: 500, shape: "sine" },
        drive: 0.4,
      },
      {
        id: "wobble",
        source: { kind: "osc", type: "square", freqHz: 640 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.12, curve: "lin" },
        filter: { type: "lowpass", freqHz: 2000 },
        lfo: { target: "freq", rateHz: 6, depth: 30, shape: "sine" },
      },
      {
        id: "bed",
        source: { kind: "noise", color: "pink" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.35, curve: "lin" },
        filter: { type: "lowpass", freqHz: 800 },
        lfo: { target: "gain", rateHz: 6, depth: 0.2, shape: "sine" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  {
    id: "eng.space-large",
    name: "Engine — Large Drive",
    version: "0.1.0",
    seed: 605,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "scifi", "drive", "sustained", "heavy"],
    },
    perception: { brightness: 0.15, weight: 0.9, roughness: 0.5, tonality: 0.55, urgency: 0.2 },
    education: {
      summary:
        "Mirrors engines/space-large.wav (Kenney). Capital-ship mass is built from slowness: two sawtooths at 82 and 84 Hz beat at 2 Hz under a 400 Hz lowpass, a 41 Hz sub swells on a 0.4 Hz cycle, and a brown-noise wash drifts its cutoff once every three seconds. Listen for the recording's depth of space — its low end blooms with room reverb that this dry synthesis deliberately lacks.",
      claims: [
        {
          text: "Perceived size rides on low resonant frequency and slow modulation together — halving both the pitch and the LFO rates of a small drive does more for 'huge' than any level change.",
          basis: "evidence",
          source: "Report: size/mass mapping (lower resonances, slower cycles)",
        },
        {
          text: "The big-ship engine as a sub-100 Hz beating drone is a film-audio inheritance — the felt-not-heard rumble tells the audience 'massive' before anything appears on screen.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "saw-a",
        source: { kind: "osc", type: "sawtooth", freqHz: 82 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.3, curve: "lin" },
        filter: { type: "lowpass", freqHz: 400 },
      },
      {
        id: "saw-b",
        source: { kind: "osc", type: "sawtooth", freqHz: 84 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.3, curve: "lin" },
        filter: { type: "lowpass", freqHz: 400 },
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 41 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.5, curve: "lin" },
        lfo: { target: "gain", rateHz: 0.4, depth: 0.3, shape: "sine" },
      },
      {
        id: "wash",
        source: { kind: "noise", color: "brown" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.4, curve: "lin" },
        filter: { type: "lowpass", freqHz: 500 },
        lfo: { target: "filter", rateHz: 0.3, depth: 200, shape: "sine" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  {
    id: "eng.motor",
    name: "Motor — Electric",
    version: "0.1.0",
    seed: 606,
    taxonomy: {
      diegesis: "diegetic",
      function: "machine",
      event: "engine-loop",
      tags: ["motor", "electric", "mechanical", "sustained"],
    },
    perception: { brightness: 0.5, weight: 0.45, roughness: 0.55, tonality: 0.5, urgency: 0.15 },
    education: {
      summary:
        "Mirrors engines/motor.wav (Nayckron, OpenGameArt) — a real heavy-vehicle engine. Three motor fingerprints: a resonant sawtooth hum with a slow 0.7 Hz pitch wow, brush noise at 2.4 kHz chopped by a 47 Hz square-wave LFO (the commutator rate), and a brown-noise floor. Listen for the recording's load changes — a real engine's hum shifts pitch and spectrum together as it labors, where this wow bends pitch alone.",
      claims: [
        {
          text: "Square-wave amplitude modulation of high noise at the rotation-times-poles rate is the literal mechanism of commutator brush noise — synthesizing the mechanism, not the spectrum, is what makes it read as electric.",
          basis: "evidence",
          source: "Electric-machine acoustics; report §engines",
        },
        {
          text: "Slow pitch wow on a machine hum signals 'real, imperfect motor' — game audio adds the flaw deliberately because a mathematically stable hum sounds synthesized.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "hum",
        source: { kind: "osc", type: "sawtooth", freqHz: 120 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.35, curve: "lin" },
        filter: { type: "bandpass", freqHz: 240, q: 4 },
        lfo: { target: "freq", rateHz: 0.7, depth: 8, shape: "sine" },
      },
      {
        id: "brush",
        source: { kind: "noise", color: "white" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.15, curve: "lin" },
        filter: { type: "bandpass", freqHz: 2400, q: 1.5 },
        lfo: { target: "gain", rateHz: 47, depth: 0.3, shape: "square" },
      },
      {
        id: "floor",
        source: { kind: "noise", color: "brown" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.3, curve: "lin" },
        filter: { type: "lowpass", freqHz: 200 },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
];
