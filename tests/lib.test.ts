import { describe, expect, it } from "vitest";
import { bipolar, deriveSeed, mulberry32 } from "../src/lib/prng";
import { generateNoise } from "../src/lib/noise";
import { encodeWav } from "../src/lib/wav";
import { validateRecipe, type SfxRecipe } from "../src/lib/recipe";
import { uiPresets } from "../src/presets/ui";

describe("prng", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(183742);
    const b = mulberry32(183742);
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b());
  });

  it("produces different streams for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const same = Array.from({ length: 100 }, () => a() === b()).filter(Boolean);
    expect(same.length).toBeLessThan(3);
  });

  it("stays in [0,1) and bipolar stays in [-1,1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const rng2 = mulberry32(42);
    for (let i = 0; i < 10000; i++) {
      const v = bipolar(rng2);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
  });

  it("deriveSeed decorrelates layer streams", () => {
    expect(deriveSeed(101, 0)).not.toBe(deriveSeed(101, 1));
    expect(deriveSeed(101, 0)).toBe(deriveSeed(101, 0));
  });
});

describe("noise", () => {
  it("is deterministic per color+seed", () => {
    for (const color of ["white", "pink", "brown"] as const) {
      const a = generateNoise(color, 4800, 7);
      const b = generateNoise(color, 4800, 7);
      expect(a).toEqual(b);
    }
  });

  it("stays within [-1, 1] for all colors", () => {
    for (const color of ["white", "pink", "brown"] as const) {
      const buf = generateNoise(color, 48000, 99);
      for (const s of buf) {
        expect(s).toBeGreaterThanOrEqual(-1);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });

  it("pink noise has less high-frequency energy than white (lag-1 autocorrelation)", () => {
    const corr = (buf: Float32Array) => {
      let num = 0, den = 0;
      for (let i = 1; i < buf.length; i++) {
        num += buf[i] * buf[i - 1];
        den += buf[i] * buf[i];
      }
      return num / den;
    };
    expect(corr(generateNoise("pink", 48000, 3))).toBeGreaterThan(
      corr(generateNoise("white", 48000, 3)),
    );
  });
});

describe("wav encoder", () => {
  it("writes a valid RIFF/WAVE header and correct sizes", () => {
    const frames = 480;
    const ch = new Float32Array(frames).fill(0.5);
    const buf = encodeWav({ channels: [ch, ch], sampleRate: 48000 });
    const view = new DataView(buf);
    const str = (o: number, n: number) =>
      String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(str(0, 4)).toBe("RIFF");
    expect(str(8, 4)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(48000); // sample rate
    expect(view.getUint32(40, true)).toBe(frames * 2 * 2); // data size
    expect(buf.byteLength).toBe(44 + frames * 2 * 2);
  });

  it("clamps samples outside [-1, 1]", () => {
    const ch = new Float32Array([2, -2]);
    const view = new DataView(encodeWav({ channels: [ch], sampleRate: 48000 }));
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32767);
  });
});

describe("recipe validation and preset integrity", () => {
  it("all 10 UI presets validate", () => {
    expect(uiPresets).toHaveLength(10);
    for (const p of uiPresets) expect(() => validateRecipe(p)).not.toThrow();
  });

  it("all UI presets are procedural-original (two-tier law)", () => {
    for (const p of uiPresets) {
      expect(p.provenance.type).toBe("procedural-original");
    }
  });

  it("all presets carry education claims with tagged basis", () => {
    for (const p of uiPresets) {
      expect(p.education.claims.length).toBeGreaterThan(0);
      for (const c of p.education.claims)
        expect(["evidence", "convention"]).toContain(c.basis);
    }
  });

  it("preset ids are unique and seeds are unique", () => {
    expect(new Set(uiPresets.map((p) => p.id)).size).toBe(uiPresets.length);
    expect(new Set(uiPresets.map((p) => p.seed)).size).toBe(uiPresets.length);
  });

  it("rejects a layer running past master duration", () => {
    const bad = structuredClone(uiPresets[0]) as SfxRecipe;
    bad.layers[0].durMs = bad.master.durMs + 100;
    expect(() => validateRecipe(bad)).toThrow(/past master.durMs/);
  });

  it("rejects noise layers with a pitch envelope", () => {
    const bad = structuredClone(uiPresets[1]) as SfxRecipe;
    const noiseLayer = bad.layers.find((l) => l.source.kind === "noise")!;
    noiseLayer.pitchEnv = { toHz: 100, timeMs: 10, curve: "lin" };
    expect(() => validateRecipe(bad)).toThrow(/noise but has a pitchEnv/);
  });
});
