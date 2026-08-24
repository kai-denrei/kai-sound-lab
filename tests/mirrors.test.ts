import { describe, expect, it } from "vitest";
import { mirrors, mirrorForCurated, mirrorForPreset } from "../src/curated/mirrors";
import { curatedSounds } from "../src/curated/manifest";
import { allPresets } from "../src/presets";

describe("mirror registry", () => {
  it("every curatedId exists in the manifest", () => {
    const ids = new Set(curatedSounds.map((s) => s.id));
    for (const m of mirrors) expect(ids, m.curatedId).toContain(m.curatedId);
  });
  it("every presetId exists in the preset library", () => {
    const ids = new Set(allPresets.map((p) => p.id));
    for (const m of mirrors) expect(ids, m.presetId).toContain(m.presetId);
  });
  it("no id appears twice", () => {
    const c = mirrors.map((m) => m.curatedId);
    const p = mirrors.map((m) => m.presetId);
    expect(new Set(c).size).toBe(c.length);
    expect(new Set(p).size).toBe(p.length);
  });
  it("lookups resolve both directions", () => {
    const m = mirrors[0];
    expect(mirrorForCurated(m.curatedId)).toEqual(m);
    expect(mirrorForPreset(m.presetId)).toEqual(m);
  });
  it("has the six engine pairs", () => {
    expect(mirrors.length).toBeGreaterThanOrEqual(6);
  });
});
