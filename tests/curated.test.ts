import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { curatedSets, curatedSounds } from "../src/curated/manifest";

const CURATED_DIR = join(__dirname, "..", "public", "curated");

function listWavs(): string[] {
  const out: string[] = [];
  for (const set of readdirSync(CURATED_DIR, { withFileTypes: true })) {
    if (!set.isDirectory()) continue;
    for (const f of readdirSync(join(CURATED_DIR, set.name)))
      if (f.endsWith(".wav")) out.push(`curated/${set.name}/${f}`);
  }
  return out;
}

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

describe("curated manifest", () => {
  it("has unique sound ids", () => {
    const ids = curatedSounds.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry references a defined set", () => {
    const setIds = new Set(curatedSets.map((s) => s.id));
    for (const s of curatedSounds) expect(setIds, s.id).toContain(s.setId);
  });

  it("file list and manifest are a bijection", () => {
    const files = listWavs().sort();
    const entries = curatedSounds.map((s) => s.file).sort();
    expect(entries).toEqual(files);
  });

  it("attribution flag matches license kind", () => {
    for (const s of curatedSounds)
      expect(s.attributionRequired, s.id).toBe(s.license !== "CC0-1.0");
  });

  it("every entry has author, source URL, and a curatorial note", () => {
    for (const s of curatedSounds) {
      expect(s.author.length, s.id).toBeGreaterThan(0);
      expect(s.source, s.id).toMatch(/^https:\/\//);
      expect(s.note.length, s.id).toBeGreaterThan(10);
    }
  });

  it("durMs matches the WAV within 5ms", () => {
    for (const s of curatedSounds) {
      const actual = wavDurMs(join(__dirname, "..", "public", s.file));
      expect(Math.abs(actual - s.durMs), s.id).toBeLessThanOrEqual(5);
    }
  });

  it("every set ships 8-12 sounds", () => {
    for (const set of curatedSets) {
      const n = curatedSounds.filter((s) => s.setId === set.id).length;
      expect(n, set.id).toBeGreaterThanOrEqual(8);
      expect(n, set.id).toBeLessThanOrEqual(12);
    }
  });
});
