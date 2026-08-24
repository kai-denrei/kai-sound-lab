import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Weapons family. Gunshots follow the report's impact anatomy — crack
 * (broadband transient), blast body (driven mid noise), low thump (mass) —
 * with caliber expressed as more low-frequency energy, longer decay, and
 * heavier drive, not just "louder". Lasers are pitch-trajectory sounds:
 * the sweep IS the identity.
 */

export const weaponPresets: SfxRecipe[] = [
  {
    id: "weapon.laser-zap",
    name: "Laser — Zap",
    version: "0.1.0",
    seed: 301,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "shot-energy",
      tags: ["laser", "scifi", "projectile"],
    },
    perception: { brightness: 0.8, weight: 0.15, roughness: 0.2, tonality: 0.75, urgency: 0.3 },
    education: {
      summary:
        "The classic arcade zap: a sawtooth falling three octaves in 120 ms with light drive, plus a faster high 'zing' layer. Nothing about a real laser sounds like this — it's a pure learned identity, and the pitch trajectory is doing all the work.",
      claims: [
        {
          text: "A strong pitch trajectory makes an event identifiable even at very short duration — the frequency gesture is more recognizable than the spectrum it moves through.",
          basis: "evidence",
          source: "Report synthesis recipes; pitch-gesture recognition",
        },
        {
          text: "Downward sweep = outgoing projectile is a game-audio convention inherited from 1970s arcade hardware, kept because everyone has already learned it.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "sweep",
        source: { kind: "osc", type: "sawtooth", freqHz: 2200 },
        durMs: 160,
        ampEnv: { attackMs: 1, decayMs: 150, peak: 0.35, curve: "exp" },
        pitchEnv: { toHz: 180, timeMs: 120, curve: "exp" },
        drive: 0.3,
      },
      {
        id: "zing",
        source: { kind: "osc", type: "sine", freqHz: 3800 },
        durMs: 70,
        ampEnv: { attackMs: 1, decayMs: 60, peak: 0.15, curve: "exp" },
        pitchEnv: { toHz: 400, timeMs: 60, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 220 },
    variation: { pitchPct: 6, gainDb: 1.5, timingMs: 2 },
  },
  {
    id: "weapon.laser-beam",
    name: "Laser — Beam",
    version: "0.1.0",
    seed: 302,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "shot-energy",
      tags: ["laser", "scifi", "sustained"],
    },
    perception: { brightness: 0.6, weight: 0.25, roughness: 0.35, tonality: 0.8, urgency: 0.25 },
    education: {
      summary:
        "A slower, thicker discharge: two triangle oscillators detuned by 6 Hz beat against each other while falling together. The beating adds motion and slight menace without any noise layer.",
      claims: [
        {
          text: "Detuning two oscillators a few Hz apart creates amplitude beating — a controlled, mild form of the roughness cue, here dosed low enough to energize rather than alarm.",
          basis: "evidence",
          source: "Roughness/beating psychoacoustics",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "oscA",
        source: { kind: "osc", type: "triangle", freqHz: 900 },
        durMs: 300,
        ampEnv: { attackMs: 4, decayMs: 280, peak: 0.32, curve: "exp" },
        pitchEnv: { toHz: 320, timeMs: 250, curve: "exp" },
        drive: 0.2,
      },
      {
        id: "oscB",
        source: { kind: "osc", type: "triangle", freqHz: 906 },
        durMs: 300,
        ampEnv: { attackMs: 4, decayMs: 280, peak: 0.32, curve: "exp" },
        pitchEnv: { toHz: 322, timeMs: 250, curve: "exp" },
        drive: 0.2,
      },
    ],
    master: { gain: 0.9, durMs: 360 },
    variation: { pitchPct: 4, gainDb: 1.2, timingMs: 3 },
  },
  {
    id: "weapon.laser-heavy",
    name: "Laser — Heavy",
    version: "0.1.0",
    seed: 303,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "shot-energy-heavy",
      tags: ["laser", "scifi", "cannon"],
    },
    perception: { brightness: 0.4, weight: 0.65, roughness: 0.45, tonality: 0.6, urgency: 0.4 },
    education: {
      summary:
        "The zap's big sibling: a heavily driven saw an octave and a half down, a sub-sweep for mass, and a driven noise layer whose bandpass slides downward with the pitch. Same gesture grammar as the zap — the family resemblance is what makes 'heavy' read as a variant, not a new weapon.",
      claims: [
        {
          text: "Communicating 'bigger' by adding low-frequency body and slower decay — rather than raising level — keeps the mix workable and matches how importance is best encoded across multiple dimensions.",
          basis: "evidence",
          source: "Report: increase multiple dimensions rather than level alone",
        },
        {
          text: "Keeping the identical downward-gesture grammar across a weapon tier (zap/beam/heavy) builds a learnable vocabulary instead of three unrelated sounds.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "sweep",
        source: { kind: "osc", type: "sawtooth", freqHz: 320 },
        durMs: 320,
        ampEnv: { attackMs: 2, decayMs: 300, peak: 0.4, curve: "exp" },
        pitchEnv: { toHz: 70, timeMs: 200, curve: "exp" },
        drive: 0.8,
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 130 },
        durMs: 280,
        ampEnv: { attackMs: 2, decayMs: 260, peak: 0.5, curve: "exp" },
        pitchEnv: { toHz: 45, timeMs: 180, curve: "exp" },
      },
      {
        id: "grit",
        source: { kind: "noise", color: "pink" },
        durMs: 240,
        ampEnv: { attackMs: 2, decayMs: 220, peak: 0.2, curve: "exp" },
        filter: { type: "bandpass", freqHz: 900, q: 1.5, env: { toHz: 300, timeMs: 200, curve: "exp" } },
        drive: 0.4,
      },
    ],
    master: { gain: 0.8, durMs: 400 },
    variation: { pitchPct: 4, gainDb: 1.2, timingMs: 3 },
  },
  {
    id: "weapon.gun-9mm",
    name: "Pistol — 9mm",
    version: "0.1.0",
    seed: 304,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "shot-ballistic",
      tags: ["gun", "pistol", "ballistic"],
    },
    perception: { brightness: 0.7, weight: 0.5, roughness: 0.5, tonality: 0.1, urgency: 0.5 },
    education: {
      summary:
        "Crack, blast, thump, action: a 3 ms driven crack marks the shot, a driven mid-band blast gives it violence, a falling low thump supplies mass, and a faint slide tick 70 ms later closes the mechanical loop. All noise and one sine — a gunshot is barely tonal.",
      claims: [
        {
          text: "The crack's broadband transient is the timing cue; games exaggerate it relative to reality because contact salience matters more than physical accuracy.",
          basis: "evidence",
          source: "Report: realism is subordinate to communication",
        },
        {
          text: "Automatic fire repeats this sound many times per second — the ±5% pitch and ±1.5 dB variation are not polish, they are what prevents machine-gun fire from sounding like a stuck sample.",
          basis: "evidence",
          source: "Habituation/repetition research; round-robin practice",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "crack",
        source: { kind: "noise", color: "white" },
        durMs: 10,
        ampEnv: { attackMs: 1, decayMs: 8, peak: 0.9, curve: "exp" },
        filter: { type: "highpass", freqHz: 2800, q: 0.7 },
        drive: 0.6,
      },
      {
        id: "blast",
        source: { kind: "noise", color: "white" },
        durMs: 80,
        ampEnv: { attackMs: 1, decayMs: 72, peak: 0.7, curve: "exp" },
        filter: { type: "bandpass", freqHz: 450, q: 0.8 },
        drive: 0.5,
      },
      {
        id: "thump",
        source: { kind: "osc", type: "sine", freqHz: 210 },
        durMs: 110,
        ampEnv: { attackMs: 1, decayMs: 100, peak: 0.6, curve: "exp" },
        pitchEnv: { toHz: 70, timeMs: 40, curve: "exp" },
      },
      {
        id: "action",
        source: { kind: "noise", color: "white" },
        delayMs: 70,
        durMs: 10,
        ampEnv: { attackMs: 1, decayMs: 8, peak: 0.15, curve: "exp" },
        filter: { type: "bandpass", freqHz: 3500, q: 2.5 },
      },
    ],
    master: { gain: 0.75, durMs: 280 },
    variation: { pitchPct: 5, gainDb: 1.5, timingMs: 2 },
  },
  {
    id: "weapon.gun-50cal",
    name: "Rifle — .50 cal",
    version: "0.1.0",
    seed: 305,
    taxonomy: {
      diegesis: "diegetic",
      function: "weapon",
      event: "shot-ballistic-heavy",
      tags: ["gun", "heavy", "ballistic"],
    },
    perception: { brightness: 0.5, weight: 0.85, roughness: 0.6, tonality: 0.1, urgency: 0.6 },
    education: {
      summary:
        "Caliber as spectrum, not volume: versus the 9mm this adds a concussion layer whose lowpass collapses from 900 to 250 Hz, a 48 Hz sub, twice the decay, and heavier drive. Played at the same master level as the pistol, it still reads unmistakably bigger.",
      claims: [
        {
          text: "Perceived size/mass rides on low-frequency energy and longer resonant decay — an artistic exaggeration of a real acoustic tendency, and the single most reliable 'bigger weapon' lever.",
          basis: "evidence",
          source: "Report: size/mass mapping (lower resonances, longer decay)",
        },
        {
          text: "The closing filter on the concussion imitates the air absorbing the blast's highs — the same cue that makes distant explosions dull. Distance and size share acoustics; games let size borrow it.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "crack",
        source: { kind: "noise", color: "white" },
        durMs: 12,
        ampEnv: { attackMs: 1, decayMs: 10, peak: 0.95, curve: "exp" },
        filter: { type: "highpass", freqHz: 2000, q: 0.7 },
        drive: 0.8,
      },
      {
        id: "concussion",
        source: { kind: "noise", color: "white" },
        durMs: 180,
        ampEnv: { attackMs: 1, decayMs: 165, peak: 0.8, curve: "exp" },
        filter: { type: "lowpass", freqHz: 900, q: 0.8, env: { toHz: 250, timeMs: 150, curve: "exp" } },
        drive: 0.7,
      },
      {
        id: "body",
        source: { kind: "osc", type: "sine", freqHz: 150 },
        durMs: 320,
        ampEnv: { attackMs: 1, decayMs: 300, peak: 0.75, curve: "exp" },
        pitchEnv: { toHz: 48, timeMs: 60, curve: "exp" },
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 60 },
        durMs: 340,
        ampEnv: { attackMs: 2, decayMs: 320, peak: 0.5, curve: "exp" },
        pitchEnv: { toHz: 38, timeMs: 200, curve: "exp" },
      },
      {
        id: "brass",
        source: { kind: "noise", color: "white" },
        delayMs: 120,
        durMs: 12,
        ampEnv: { attackMs: 1, decayMs: 10, peak: 0.12, curve: "exp" },
        filter: { type: "bandpass", freqHz: 2800, q: 3 },
      },
    ],
    master: { gain: 0.7, durMs: 620 },
    variation: { pitchPct: 4, gainDb: 1.2, timingMs: 2 },
  },
];
