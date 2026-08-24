import type { SfxRecipe } from "../lib/recipe";
import { GENERATOR_VERSION } from "../lib";

/**
 * Milestone 1: the UI family. Ten presets, pure synthesis, no samples.
 * Recipes follow the research report's anatomy (transient / body / texture /
 * resonance / tail — UI sounds are mostly transient) and its cheat-sheet
 * mappings. Education claims are tagged `evidence` only where psychoacoustics
 * research backs them; learned design conventions are tagged `convention`.
 */

const provenance = {
  type: "procedural-original",
  recordedSources: false,
  downloadedAudioSources: false,
  generatorVersion: GENERATOR_VERSION,
} as const;

const uiTaxonomy = (event: string, tags: string[] = []) => ({
  diegesis: "non-diegetic" as const,
  function: "ui",
  event,
  tags: ["ui", ...tags],
});

const stdVariation = { pitchPct: 3, gainDb: 1, timingMs: 3 };

export const uiPresets: SfxRecipe[] = [
  {
    id: "ui.hover",
    name: "Hover",
    version: "0.1.0",
    seed: 101,
    taxonomy: uiTaxonomy("pointer-hover", ["subtle"]),
    perception: { brightness: 0.55, weight: 0.05, roughness: 0.05, tonality: 0.6, urgency: 0.05 },
    education: {
      summary:
        "An acknowledgment, not an event. Deliberately quieter and softer-edged than the click so the stronger transient stays reserved for activation.",
      claims: [
        {
          text: "Fast attacks make event boundaries easy to locate in time; hover softens the attack precisely because hovering is not a committed event.",
          basis: "evidence",
          source: "Timbre research on attack time; audiovisual timing studies",
        },
        {
          text: "Reserving transient energy for activation (click) and giving hover a weaker onset is a design convention, not a psychoacoustic law.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "tick",
        source: { kind: "osc", type: "triangle", freqHz: 1400 },
        durMs: 40,
        ampEnv: { attackMs: 4, decayMs: 30, peak: 0.22, curve: "exp" },
        filter: { type: "lowpass", freqHz: 3200, q: 0.7 },
      },
    ],
    master: { gain: 0.9, durMs: 90 },
    variation: stdVariation,
  },
  {
    id: "ui.click",
    name: "Click",
    version: "0.1.0",
    seed: 102,
    taxonomy: uiTaxonomy("activate", ["primary"]),
    perception: { brightness: 0.75, weight: 0.1, roughness: 0.1, tonality: 0.35, urgency: 0.15 },
    education: {
      summary:
        "A broadband micro-transient plus a tiny tonal tick. The noise burst makes the timing unmistakable; the tonal component gives it a repeatable identity.",
      claims: [
        {
          text: "Broadband onsets are temporally salient — a short noise transient tells the player/user exactly when the event happened.",
          basis: "evidence",
          source: "Auditory transient salience; AV synchrony research",
        },
        {
          text: "Extreme brevity (<30 ms) prevents clutter when the sound repeats rapidly.",
          basis: "evidence",
          source: "Masking research: short sounds occupy less time-frequency real estate",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "transient",
        source: { kind: "noise", color: "white" },
        durMs: 20,
        ampEnv: { attackMs: 1, decayMs: 18, peak: 0.5, curve: "exp" },
        filter: { type: "highpass", freqHz: 2500, q: 0.7 },
      },
      {
        id: "tick",
        source: { kind: "osc", type: "triangle", freqHz: 1900 },
        durMs: 30,
        ampEnv: { attackMs: 1, decayMs: 24, peak: 0.3, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 80 },
    variation: stdVariation,
  },
  {
    id: "ui.confirm",
    name: "Confirm",
    version: "0.1.0",
    seed: 103,
    taxonomy: uiTaxonomy("confirm", ["positive"]),
    perception: { brightness: 0.65, weight: 0.15, roughness: 0.05, tonality: 0.9, urgency: 0.1 },
    education: {
      summary:
        "Two clean notes a perfect fifth apart, rising. Keeps click-like immediacy while giving success a repeatable tonal identity.",
      claims: [
        {
          text: "Consonant intervals and harmonic (non-rough) spectra read as stable and benign; warning research associates inharmonicity and roughness with urgency, so their absence signals safety.",
          basis: "evidence",
          source: "Edworthy/Hellier warning-parameter research",
        },
        {
          text: "\"Rising pitch = positive/success\" is a learned convention of interface grammar, not a universal psychoacoustic fact. It works because it is applied consistently.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "note1",
        source: { kind: "osc", type: "sine", freqHz: 587 },
        durMs: 90,
        ampEnv: { attackMs: 3, decayMs: 80, peak: 0.4, curve: "exp" },
      },
      {
        id: "note2",
        source: { kind: "osc", type: "sine", freqHz: 880 },
        delayMs: 70,
        durMs: 130,
        ampEnv: { attackMs: 3, decayMs: 120, peak: 0.42, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 260 },
    variation: stdVariation,
  },
  {
    id: "ui.cancel",
    name: "Cancel / Back",
    version: "0.1.0",
    seed: 104,
    taxonomy: uiTaxonomy("cancel", ["neutral"]),
    perception: { brightness: 0.45, weight: 0.15, roughness: 0.05, tonality: 0.85, urgency: 0.1 },
    education: {
      summary:
        "The confirm gesture mirrored: two notes falling a fourth. Same family grammar, opposite direction — dismissal without alarm.",
      claims: [
        {
          text: "Keeping cancel tonally clean (no roughness, no inharmonicity) separates \"dismissed\" from \"error\" — roughness is reserved as a danger cue.",
          basis: "evidence",
          source: "Acoustic roughness salience research",
        },
        {
          text: "\"Falling pitch = closing/leaving\" is interface grammar by convention, learned through consistent use.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "note1",
        source: { kind: "osc", type: "sine", freqHz: 660 },
        durMs: 80,
        ampEnv: { attackMs: 3, decayMs: 70, peak: 0.38, curve: "exp" },
      },
      {
        id: "note2",
        source: { kind: "osc", type: "sine", freqHz: 494 },
        delayMs: 65,
        durMs: 120,
        ampEnv: { attackMs: 3, decayMs: 110, peak: 0.36, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 240 },
    variation: stdVariation,
  },
  {
    id: "ui.error",
    name: "Error",
    version: "0.1.0",
    seed: 105,
    taxonomy: uiTaxonomy("error", ["negative", "alert"]),
    perception: { brightness: 0.4, weight: 0.3, roughness: 0.55, tonality: 0.5, urgency: 0.55 },
    education: {
      summary:
        "A hard onset and two closely-spaced low tones that beat against each other. The spectral instability is the message: something is wrong.",
      claims: [
        {
          text: "Close tone pairs create beating — perceived roughness — and rapid amplitude modulation in this range measurably increases aversion and salience. This is the strongest evidence-backed cue in the UI family.",
          basis: "evidence",
          source: "Roughness/aversion research (amplitude modulation ~20–200 Hz)",
        },
        {
          text: "Inharmonicity contributes to perceived urgency in warning design.",
          basis: "evidence",
          source: "Edworthy/Hellier warning-parameter research",
        },
        {
          text: "Roughness must be *reserved* — if ordinary UI sounds are rough, the error loses its distinct danger address.",
          basis: "evidence",
          source: "Masking/information-design principle from the research report",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "onset",
        source: { kind: "noise", color: "white" },
        durMs: 15,
        ampEnv: { attackMs: 1, decayMs: 12, peak: 0.35, curve: "exp" },
        filter: { type: "bandpass", freqHz: 900, q: 1.2 },
      },
      {
        id: "toneA",
        source: { kind: "osc", type: "square", freqHz: 220 },
        durMs: 180,
        ampEnv: { attackMs: 2, decayMs: 170, peak: 0.28, curve: "exp" },
        filter: { type: "lowpass", freqHz: 1400, q: 0.8 },
      },
      {
        id: "toneB",
        source: { kind: "osc", type: "square", freqHz: 233 },
        durMs: 180,
        ampEnv: { attackMs: 2, decayMs: 170, peak: 0.28, curve: "exp" },
        filter: { type: "lowpass", freqHz: 1400, q: 0.8 },
      },
    ],
    master: { gain: 0.85, durMs: 260 },
    variation: { pitchPct: 1.5, gainDb: 0.8, timingMs: 2 },
  },
  {
    id: "ui.disabled",
    name: "Disabled",
    version: "0.1.0",
    seed: 106,
    taxonomy: uiTaxonomy("disabled", ["negative-soft"]),
    perception: { brightness: 0.15, weight: 0.2, roughness: 0.1, tonality: 0.5, urgency: 0.05 },
    education: {
      summary:
        "A dull, bandwidth-starved thud. The interaction registered, but nothing opened — the sound is the acoustic shape of a door that didn't budge.",
      claims: [
        {
          text: "Reduced bandwidth and a weakened transient genuinely lower salience — the sound physically carries less information.",
          basis: "evidence",
          source: "Timbre/brightness (spectral centroid) research",
        },
        {
          text: "\"Unavailable = duller\" as a semantic mapping is a useful convention, not a universal law — the report flags exactly this one.",
          basis: "convention",
          source: "Research report, sound-as-information table",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "thud",
        source: { kind: "osc", type: "triangle", freqHz: 180 },
        durMs: 90,
        ampEnv: { attackMs: 8, decayMs: 80, peak: 0.4, curve: "exp" },
        filter: { type: "lowpass", freqHz: 500, q: 0.6 },
      },
    ],
    master: { gain: 0.9, durMs: 140 },
    variation: stdVariation,
  },
  {
    id: "ui.toggle-on",
    name: "Toggle On",
    version: "0.1.0",
    seed: 107,
    taxonomy: uiTaxonomy("toggle-on", ["state-change"]),
    perception: { brightness: 0.7, weight: 0.1, roughness: 0.05, tonality: 0.75, urgency: 0.1 },
    education: {
      summary:
        "A short upward sweep — a miniature of the confirm gesture. Paired with toggle-off as a mirrored couple so state direction is audible without looking.",
      claims: [
        {
          text: "A clear pitch trajectory makes an event identifiable even at very short durations (the laser principle, miniaturized).",
          basis: "evidence",
          source: "Pitch-gesture recognition; report synthesis recipes",
        },
        {
          text: "Up = on, down = off is pure convention — its value is the *mirrored pairing*, which makes the two states discriminable relative to each other.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "sweep",
        source: { kind: "osc", type: "triangle", freqHz: 700 },
        durMs: 70,
        ampEnv: { attackMs: 2, decayMs: 60, peak: 0.35, curve: "exp" },
        pitchEnv: { toHz: 1250, timeMs: 55, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 130 },
    variation: stdVariation,
  },
  {
    id: "ui.toggle-off",
    name: "Toggle Off",
    version: "0.1.0",
    seed: 108,
    taxonomy: uiTaxonomy("toggle-off", ["state-change"]),
    perception: { brightness: 0.5, weight: 0.1, roughness: 0.05, tonality: 0.75, urgency: 0.05 },
    education: {
      summary: "The exact mirror of toggle-on: same envelope, inverted sweep.",
      claims: [
        {
          text: "Mirrored gestures form a two-item auditory vocabulary: the listener learns one contrast, not two arbitrary sounds.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "sweep",
        source: { kind: "osc", type: "triangle", freqHz: 1250 },
        durMs: 70,
        ampEnv: { attackMs: 2, decayMs: 60, peak: 0.33, curve: "exp" },
        pitchEnv: { toHz: 700, timeMs: 55, curve: "exp" },
      },
    ],
    master: { gain: 0.9, durMs: 130 },
    variation: stdVariation,
  },
  {
    id: "ui.slider-tick",
    name: "Slider Tick",
    version: "0.1.0",
    seed: 109,
    taxonomy: uiTaxonomy("slider-step", ["repeating", "subtle"]),
    perception: { brightness: 0.8, weight: 0.02, roughness: 0.05, tonality: 0.2, urgency: 0.02 },
    education: {
      summary:
        "Nearly pure transient — a 4 ms filtered tick. Designed for rates of 10+ per second without smearing into a tone or fatiguing the ear.",
      claims: [
        {
          text: "At high repetition rates, duration is the enemy: overlapping tails mask each other and the ticks fuse. Keeping the sound almost all transient preserves each step as a discrete event.",
          basis: "evidence",
          source: "Temporal masking research",
        },
        {
          text: "Repeated identical stimuli habituate; the preset's bounded pitch variation (±3%) keeps the tick perceptible without changing its identity.",
          basis: "evidence",
          source: "Auditory habituation/repetition studies",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "tick",
        source: { kind: "noise", color: "white" },
        durMs: 12,
        ampEnv: { attackMs: 1, decayMs: 8, peak: 0.3, curve: "exp" },
        filter: { type: "bandpass", freqHz: 3200, q: 2.5 },
      },
    ],
    master: { gain: 0.9, durMs: 50 },
    variation: { pitchPct: 3, gainDb: 1.5, timingMs: 0 },
  },
  {
    id: "ui.modal-open",
    name: "Modal Open",
    version: "0.1.0",
    seed: 110,
    taxonomy: uiTaxonomy("modal-open", ["transition"]),
    perception: { brightness: 0.5, weight: 0.25, roughness: 0.05, tonality: 0.6, urgency: 0.1 },
    education: {
      summary:
        "A soft rising tone under a filtered air layer — arrival of a surface, not an event demanding action. The longest sound in the family, and still under 300 ms.",
      claims: [
        {
          text: "Increasing bandwidth over time (the opening filter on the noise layer) reads as expansion — the same principle the report's power-up recipe uses, at UI scale.",
          basis: "convention",
          source: "Report synthesis recipes (power-up)",
        },
        {
          text: "Keeping even \"large\" UI transitions brief respects the web context: users tolerate far less audio in interfaces than in games, and sounds that outlast their animation feel laggy.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "rise",
        source: { kind: "osc", type: "triangle", freqHz: 320 },
        durMs: 220,
        ampEnv: { attackMs: 30, decayMs: 180, peak: 0.3, curve: "exp" },
        pitchEnv: { toHz: 640, timeMs: 180, curve: "exp" },
      },
      {
        id: "air",
        source: { kind: "noise", color: "pink" },
        durMs: 240,
        ampEnv: { attackMs: 60, decayMs: 170, peak: 0.14, curve: "exp" },
        filter: { type: "bandpass", freqHz: 1800, q: 0.9 },
      },
    ],
    master: { gain: 0.9, durMs: 320 },
    variation: stdVariation,
  },
];
