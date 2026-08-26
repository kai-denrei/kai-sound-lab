import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  creatorPacks,
  creatorSounds,
  creators,
  groupLabels,
} from "../src/creators/manifest";
import { allPresets } from "../src/presets";

const PUBLIC_DIR = join(__dirname, "..", "public");

/** Duration in ms from RIFF header: data chunk bytes / byte rate. */
function wavDurMs(path: string): number {
  const b = readFileSync(path);
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  const byteRate = b.readUInt32LE(28);
  let off = 12;
  while (off < b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") return (size / byteRate) * 1000;
    off += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${path}`);
}

const packDir = (packId: string): string => {
  const pack = creatorPacks.find((p) => p.id === packId)!;
  return join(PUBLIC_DIR, "creators", pack.creatorId, pack.id);
};

/**
 * Creator pack audio is gitignored — licensed for use, not redistribution.
 * Structure is checked always; the files are checked only where they happen
 * to exist, so the suite passes on a fresh clone and in CI.
 */
describe("creators manifest", () => {
  it("has unique ids across creators, packs, and sounds", () => {
    for (const ids of [
      creators.map((c) => c.id),
      creatorPacks.map((p) => p.id),
      creatorSounds.map((s) => s.id),
    ])
      expect(new Set(ids).size).toBe(ids.length);
  });

  it("every pack resolves to a defined creator", () => {
    const ids = new Set(creators.map((c) => c.id));
    for (const p of creatorPacks) expect(ids, p.id).toContain(p.creatorId);
  });

  it("every sound resolves to a defined pack", () => {
    const ids = new Set(creatorPacks.map((p) => p.id));
    for (const s of creatorSounds) expect(ids, s.id).toContain(s.packId);
  });

  it("every file path is well-formed and under its own pack directory", () => {
    for (const s of creatorSounds) {
      const pack = creatorPacks.find((p) => p.id === s.packId)!;
      expect(s.file, s.id).toMatch(
        new RegExp(`^creators/${pack.creatorId}/${pack.id}/[a-z0-9-]+\\.wav$`),
      );
    }
  });

  it("every creator has an https url, a handle, and a credit line", () => {
    for (const c of creators) {
      expect(c.url, c.id).toMatch(/^https:\/\//);
      expect(c.handle.length, c.id).toBeGreaterThan(0);
      expect(c.handle, c.id).not.toContain("@"); // the @ is presentation
      expect(c.creditLine.length, c.id).toBeGreaterThan(0);
      expect(c.blurb.length, c.id).toBeGreaterThan(10);
    }
  });

  it("every pack states its own url and quotes its licence terms", () => {
    for (const p of creatorPacks) {
      expect(p.url, p.id).toMatch(/^https:\/\//);
      expect(p.licenseSummary.length, p.id).toBeGreaterThan(0);
      // Verbatim terms, not a paraphrase — long enough to actually be terms.
      expect(p.licenseTerms.length, p.id).toBeGreaterThan(40);
      expect(p.blurb.length, p.id).toBeGreaterThan(10);
    }
  });

  it("every sound has a curatorial note and a labelled group", () => {
    for (const s of creatorSounds) {
      expect(s.note.length, s.id).toBeGreaterThan(10);
      expect(Object.keys(groupLabels), s.id).toContain(s.group);
    }
  });

  it("every declared synth mirror resolves to a real preset", () => {
    const ids = new Set(allPresets.map((p) => p.id));
    for (const s of creatorSounds)
      if (s.mirrorsPresetId) expect(ids, s.id).toContain(s.mirrorsPresetId);
  });

  it("no preset is claimed as a mirror twice", () => {
    const claimed = creatorSounds
      .map((s) => s.mirrorsPresetId)
      .filter((id): id is string => Boolean(id));
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  /* ---- disk-dependent: skipped when the gitignored audio is absent ---- */

  for (const pack of creatorPacks) {
    const dir = packDir(pack.id);
    const present = existsSync(dir);

    it.skipIf(!present)(
      `${pack.id}: file list and manifest are a bijection`,
      () => {
        const files = readdirSync(dir)
          .filter((f) => f.endsWith(".wav"))
          .map((f) => `creators/${pack.creatorId}/${pack.id}/${f}`)
          .sort();
        const entries = creatorSounds
          .filter((s) => s.packId === pack.id)
          .map((s) => s.file)
          .sort();
        expect(entries).toEqual(files);
      },
    );

    it.skipIf(!present)(`${pack.id}: durMs matches the WAV within 5ms`, () => {
      for (const s of creatorSounds.filter((x) => x.packId === pack.id)) {
        const actual = wavDurMs(join(PUBLIC_DIR, s.file));
        expect(Math.abs(actual - s.durMs), s.id).toBeLessThanOrEqual(5);
      }
    });
  }
});
