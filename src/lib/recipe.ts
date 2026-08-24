/**
 * The canonical asset of kai-sound-lab is the recipe, not the WAV.
 * A recipe = synthesis graph parameters + taxonomy + perceptual target
 * + educational rationale + bounded variation + provenance + seed.
 *
 * Provenance is two-tier by project law (2026-08-24):
 *  - "procedural-original": pure math, no recorded or downloaded sources, ever.
 *  - "external-cc0": imported CC0 asset with full license provenance.
 * The tiers never blend silently; the type system keeps them apart.
 */

export type OscType = "sine" | "triangle" | "square" | "sawtooth";
export type NoiseColor = "white" | "pink" | "brown";
export type Curve = "lin" | "exp";

export interface OscSource {
  kind: "osc";
  type: OscType;
  freqHz: number;
}

export interface NoiseSource {
  kind: "noise";
  color: NoiseColor;
}

export interface AmpEnv {
  attackMs: number;
  decayMs: number;
  /** Peak linear gain of this layer, 0..1. */
  peak: number;
  curve: Curve;
}

export interface PitchEnv {
  toHz: number;
  timeMs: number;
  curve: Curve;
}

export interface FilterSpec {
  type: BiquadFilterType;
  freqHz: number;
  q?: number;
  gainDb?: number;
}

export interface Layer {
  id: string;
  source: OscSource | NoiseSource;
  /** Start offset from note-on. Lets one recipe hold multi-note gestures. */
  delayMs?: number;
  durMs: number;
  ampEnv: AmpEnv;
  /** Oscillator layers only; ignored for noise. */
  pitchEnv?: PitchEnv;
  filter?: FilterSpec;
}

/** Perceptual target, 0..1 each. Searchable; not derived from the graph. */
export interface Perception {
  brightness: number;
  weight: number;
  roughness: number;
  tonality: number;
  urgency: number;
}

export type ClaimBasis = "evidence" | "convention";

/**
 * Educational metadata. `basis` separates claims backed by psychoacoustics
 * research from learned design conventions — the library never presents a
 * convention as science.
 */
export interface EducationClaim {
  text: string;
  basis: ClaimBasis;
  source?: string;
}

export interface Education {
  summary: string;
  claims: EducationClaim[];
}

export interface ProceduralProvenance {
  type: "procedural-original";
  recordedSources: false;
  downloadedAudioSources: false;
  generatorVersion: string;
}

export interface ExternalCc0Provenance {
  type: "external-cc0";
  creator: string;
  source: string;
  license: "CC0-1.0";
  licenseCheckedAt: string;
  sha256: string;
}

export type Provenance = ProceduralProvenance | ExternalCc0Provenance;

/** Bounded randomization: variation without semantic drift. */
export interface Variation {
  pitchPct: number;
  gainDb: number;
  timingMs: number;
}

export interface Taxonomy {
  diegesis: "diegetic" | "non-diegetic" | "transdiegetic";
  function: string;
  event: string;
  tags: string[];
}

export interface SfxRecipe {
  id: string;
  name: string;
  version: string;
  seed: number;
  taxonomy: Taxonomy;
  perception: Perception;
  education: Education;
  provenance: Provenance;
  layers: Layer[];
  master: {
    gain: number;
    pan?: number;
    /** Total render length; must cover the longest layer tail. */
    durMs: number;
  };
  variation: Variation;
}

/** Structural sanity checks; throws with a readable message on violation. */
export function validateRecipe(r: SfxRecipe): void {
  const fail = (msg: string) => {
    throw new Error(`recipe "${r.id}": ${msg}`);
  };
  if (!r.layers.length) fail("has no layers");
  if (r.master.durMs <= 0) fail("master.durMs must be positive");
  for (const layer of r.layers) {
    const end = (layer.delayMs ?? 0) + layer.durMs;
    if (end > r.master.durMs)
      fail(`layer "${layer.id}" ends at ${end}ms, past master.durMs ${r.master.durMs}ms`);
    if (layer.ampEnv.peak < 0 || layer.ampEnv.peak > 1)
      fail(`layer "${layer.id}" peak out of 0..1`);
    if (layer.source.kind === "noise" && layer.pitchEnv)
      fail(`layer "${layer.id}" is noise but has a pitchEnv`);
  }
  const p = r.perception;
  for (const [k, v] of Object.entries(p))
    if (v < 0 || v > 1) fail(`perception.${k} out of 0..1`);
  if (r.provenance.type === "procedural-original") {
    if (r.provenance.recordedSources || r.provenance.downloadedAudioSources)
      fail("procedural-original provenance cannot reference recorded/downloaded sources");
  }
}
