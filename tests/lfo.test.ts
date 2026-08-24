import { describe, expect, it } from "vitest";
import type { SfxRecipe } from "../src/lib/recipe";
import { validateRecipe } from "../src/lib/recipe";

const base = (): SfxRecipe => ({
  id: "t.lfo", name: "t", version: "0.0.1", seed: 1,
  taxonomy: { diegesis: "diegetic", function: "test", event: "test", tags: [] },
  perception: { brightness: 0, weight: 0, roughness: 0, tonality: 0, urgency: 0 },
  education: { summary: "s", claims: [] },
  provenance: { type: "procedural-original", recordedSources: false, downloadedAudioSources: false, generatorVersion: "t" },
  layers: [{
    id: "l1",
    source: { kind: "osc", type: "sine", freqHz: 100 },
    durMs: 1000,
    ampEnv: { attackMs: 10, holdMs: 800, decayMs: 190, peak: 0.5, curve: "lin" },
    filter: { type: "lowpass", freqHz: 800 },
  }],
  master: { gain: 1, durMs: 1000 },
  variation: { pitchPct: 0, gainDb: 0, timingMs: 0 },
});

const withLfo = (lfo: object, mut?: (r: SfxRecipe) => void): SfxRecipe => {
  const r = base();
  (r.layers[0] as { lfo?: object }).lfo = lfo;
  mut?.(r);
  return r;
};

describe("lfo validation", () => {
  it("accepts a valid gain LFO", () => {
    expect(() => validateRecipe(withLfo({ target: "gain", rateHz: 4, depth: 0.5, shape: "sine" }))).not.toThrow();
  });
  it("rejects freq target on noise layers", () => {
    expect(() => validateRecipe(withLfo(
      { target: "freq", rateHz: 4, depth: 10, shape: "sine" },
      (r) => { r.layers[0].source = { kind: "noise", color: "pink" }; delete r.layers[0].filter; },
    ))).toThrow(/freq LFO/);
  });
  it("rejects filter target without a filter", () => {
    expect(() => validateRecipe(withLfo(
      { target: "filter", rateHz: 4, depth: 100, shape: "sine" },
      (r) => { delete r.layers[0].filter; },
    ))).toThrow(/filter LFO/);
  });
  it("rejects filter depth >= filter freqHz", () => {
    expect(() => validateRecipe(withLfo({ target: "filter", rateHz: 4, depth: 800, shape: "sine" }))).toThrow(/depth/);
  });
  it("rejects rateHz outside 0.05-50", () => {
    expect(() => validateRecipe(withLfo({ target: "gain", rateHz: 60, depth: 0.5, shape: "sine" }))).toThrow(/rateHz/);
    expect(() => validateRecipe(withLfo({ target: "gain", rateHz: 0.01, depth: 0.5, shape: "sine" }))).toThrow(/rateHz/);
  });
  it("rejects gain depth > 1 and negative depth", () => {
    expect(() => validateRecipe(withLfo({ target: "gain", rateHz: 4, depth: 1.5, shape: "sine" }))).toThrow(/depth/);
    expect(() => validateRecipe(withLfo({ target: "gain", rateHz: 4, depth: -0.1, shape: "sine" }))).toThrow(/depth/);
  });
  it("rejects negative holdMs", () => {
    const r = base();
    r.layers[0].ampEnv.holdMs = -5;
    expect(() => validateRecipe(r)).toThrow(/holdMs/);
  });
});
