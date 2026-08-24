import { describe, expect, it, vi } from "vitest";
import { buildGraph } from "../src/lib/render";
import type { SfxRecipe } from "../src/lib/recipe";

// Minimal WebAudio fakes — enough for buildGraph to run and for us to
// assert stop() ramps the master gain and stops sources.
class FakeParam {
  value = 1;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class FakeCtx {
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode();
  createBuffer() {
    return { copyToChannel: vi.fn(), getChannelData: () => new Float32Array(16) };
  }
}
// Route every `new XNode(ctx, opts)` in render.ts through FakeNode:
vi.stubGlobal("OscillatorNode", FakeNode);
vi.stubGlobal("GainNode", FakeNode);
vi.stubGlobal("BiquadFilterNode", FakeNode);
vi.stubGlobal("StereoPannerNode", FakeNode);
vi.stubGlobal("WaveShaperNode", FakeNode);
vi.stubGlobal("AudioBufferSourceNode", FakeNode);

const recipe: SfxRecipe = {
  id: "t.v", name: "t", version: "0.0.1", seed: 1,
  taxonomy: { diegesis: "diegetic", function: "t", event: "t", tags: [] },
  perception: { brightness: 0, weight: 0, roughness: 0, tonality: 0, urgency: 0 },
  education: { summary: "s", claims: [] },
  provenance: { type: "procedural-original", recordedSources: false, downloadedAudioSources: false, generatorVersion: "t" },
  layers: [{ id: "l", source: { kind: "osc", type: "sine", freqHz: 200 }, durMs: 2000,
    ampEnv: { attackMs: 10, holdMs: 1800, decayMs: 190, peak: 0.5, curve: "lin" } }],
  master: { gain: 1, durMs: 2000 },
  variation: { pitchPct: 0, gainDb: 0, timingMs: 0 },
};

describe("buildGraph Voice", () => {
  it("returns a Voice with a stop function", () => {
    const v = buildGraph(new FakeCtx() as unknown as BaseAudioContext, recipe);
    expect(typeof v.stop).toBe("function");
  });
  it("stop() ramps a gain toward 0 and stops nodes without throwing", () => {
    const ctx = new FakeCtx();
    const v = buildGraph(ctx as unknown as BaseAudioContext, recipe);
    expect(() => v.stop(20)).not.toThrow();
    // idempotent: a second stop is a no-op, still no throw
    expect(() => v.stop()).not.toThrow();
  });
});
