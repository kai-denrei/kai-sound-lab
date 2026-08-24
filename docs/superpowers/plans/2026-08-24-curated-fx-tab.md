# Curated FX Library Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third "Library" tab of curated open-source SFX sets (CC0/CC BY, fully attributed) with rack-style browsing, scope playback, and per-set zip downloads bundling a generated CREDITS.txt.

**Architecture:** A typed manifest (`src/curated/manifest.ts`) is the single source of truth for sounds committed under `public/curated/`. The tab UI decodes files to `AudioBuffer`s so the existing waveform/scope machinery works unchanged. A dependency-free ZIP writer (STORE method) packs set downloads in the browser.

**Tech Stack:** Vanilla TS + Vite (existing), vitest, ffmpeg (curation only, not build), no new npm dependencies.

## Global Constraints

- License floor: only `"CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0"` (spec: no NC, no SA).
- Attribution shown for every sound, even CC0 (provenance).
- No new runtime dependencies; ZIP uses STORE method (WAV doesn't compress).
- Asset URLs must respect `import.meta.env.BASE_URL` (site deploys under `/kai-sound-lab/` on Pages).
- App layer stays thin: logic in `src/lib` / `src/curated`, tested in vitest.
- Commit after each task; run `npm test` before each commit.

---

### Task 1: ZIP writer

**Files:**
- Create: `src/lib/zip.ts`
- Modify: `src/lib/index.ts` (re-export)
- Test: `tests/zip.test.ts`

**Interfaces:**
- Produces: `crc32(data: Uint8Array): number` (unsigned), `buildZip(entries: ZipEntry[]): Uint8Array`, `interface ZipEntry { name: string; data: Uint8Array }`

- [ ] **Step 1: Write failing tests** (`tests/zip.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "../src/lib/zip";

const ascii = (s: string) => new TextEncoder().encode(s);
const u32 = (b: Uint8Array, off: number) =>
  (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
const u16 = (b: Uint8Array, off: number) => b[off] | (b[off + 1] << 8);

describe("crc32", () => {
  it("matches the standard check vector", () => {
    expect(crc32(ascii("123456789"))).toBe(0xcbf43926);
  });
  it("is 0 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("buildZip", () => {
  const zip = buildZip([
    { name: "a.txt", data: ascii("hello") },
    { name: "dir/b.bin", data: new Uint8Array([0, 255, 128]) },
  ]);

  it("starts with a local file header signature", () => {
    expect(u32(zip, 0)).toBe(0x04034b50);
  });
  it("uses STORE (method 0) and correct sizes in the first header", () => {
    expect(u16(zip, 8)).toBe(0); // compression method
    expect(u32(zip, 18)).toBe(5); // compressed size
    expect(u32(zip, 22)).toBe(5); // uncompressed size
    expect(u16(zip, 26)).toBe(5); // name length "a.txt"
  });
  it("stores the file bytes verbatim after the header", () => {
    const nameLen = u16(zip, 26);
    const body = zip.slice(30 + nameLen, 30 + nameLen + 5);
    expect(new TextDecoder().decode(body)).toBe("hello");
  });
  it("ends with an EOCD recording 2 entries", () => {
    const eocd = zip.length - 22;
    expect(u32(zip, eocd)).toBe(0x06054b50);
    expect(u16(zip, eocd + 10)).toBe(2); // total entries
  });
  it("central directory offset points at a central header", () => {
    const eocd = zip.length - 22;
    const cdOff = u32(zip, eocd + 16);
    expect(u32(zip, cdOff)).toBe(0x02014b50);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (module not found)

- [ ] **Step 3: Implement** (`src/lib/zip.ts`)

```ts
/**
 * Minimal ZIP writer, STORE method only. WAV data doesn't compress
 * meaningfully, so storing keeps this dependency-free and byte-testable.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Fixed DOS timestamp (2026-08-24 00:00) keeps output deterministic.
const DOS_DATE = ((2026 - 1980) << 9) | (8 << 5) | 24;
const DOS_TIME = 0;

class ByteWriter {
  private chunks: Uint8Array[] = [];
  length = 0;
  u16(v: number): void { this.push(new Uint8Array([v & 0xff, (v >>> 8) & 0xff])); }
  u32(v: number): void {
    this.push(new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]));
  }
  push(b: Uint8Array): void { this.chunks.push(b); this.length += b.length; }
  bytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let off = 0;
    for (const c of this.chunks) { out.set(c, off); off += c.length; }
    return out;
  }
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const w = new ByteWriter();
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];
  const enc = new TextEncoder();

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    central.push({ name, crc, size: e.data.length, offset: w.length });
    w.u32(0x04034b50); // local file header
    w.u16(20);         // version needed
    w.u16(0);          // flags
    w.u16(0);          // method: STORE
    w.u16(DOS_TIME);
    w.u16(DOS_DATE);
    w.u32(crc);
    w.u32(e.data.length); // compressed
    w.u32(e.data.length); // uncompressed
    w.u16(name.length);
    w.u16(0);          // extra length
    w.push(name);
    w.push(e.data);
  }

  const cdStart = w.length;
  for (const c of central) {
    w.u32(0x02014b50); // central directory header
    w.u16(20); w.u16(20); w.u16(0); w.u16(0);
    w.u16(DOS_TIME); w.u16(DOS_DATE);
    w.u32(c.crc); w.u32(c.size); w.u32(c.size);
    w.u16(c.name.length); w.u16(0); w.u16(0);
    w.u16(0); w.u16(0); w.u32(0);
    w.u32(c.offset);
    w.push(c.name);
  }
  const cdSize = w.length - cdStart;

  w.u32(0x06054b50); // EOCD
  w.u16(0); w.u16(0);
  w.u16(central.length); w.u16(central.length);
  w.u32(cdSize); w.u32(cdStart);
  w.u16(0);
  return w.bytes();
}
```

Add to `src/lib/index.ts`: `export { buildZip, crc32, type ZipEntry } from "./zip";`

- [ ] **Step 4: Run tests** — `npm test` → PASS. Also verify externally once:
  write the test zip to a temp file and run `unzip -t` on it (manual check, not committed).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "ZIP writer (STORE) with CRC-32, byte-level tests"`

---

### Task 2: Curated manifest types + validation suite

**Files:**
- Create: `src/curated/manifest.ts`
- Test: `tests/curated.test.ts`

**Interfaces:**
- Produces:
  - `type CuratedLicense = "CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0"`
  - `interface CuratedSound { id: string; name: string; setId: string; file: string; durMs: number; source: string; author: string; license: CuratedLicense; attributionRequired: boolean; note: string }`
  - `interface CuratedSet { id: string; name: string; blurb: string; mirrorsFamily: string }`
  - `export const curatedSets: CuratedSet[]`, `export const curatedSounds: CuratedSound[]`

- [ ] **Step 1: Write the manifest module with set definitions and EMPTY sounds list**

```ts
/**
 * Curated library manifest — the single source of truth for every file
 * under public/curated/. tests/curated.test.ts enforces the bijection:
 * no entry without a file, no file without an entry, licenses within
 * the floor (CC0 / CC BY only), attribution flags consistent.
 */

export type CuratedLicense = "CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0";

export interface CuratedSound {
  id: string;
  name: string;
  setId: string;
  /** Path under public/, e.g. "curated/interface/click-01.wav" */
  file: string;
  durMs: number;
  /** URL of the exact source asset/pack page */
  source: string;
  author: string;
  license: CuratedLicense;
  attributionRequired: boolean;
  /** Curatorial voice: why this sound is in the set */
  note: string;
}

export interface CuratedSet {
  id: string;
  name: string;
  blurb: string;
  /** The synth family this set mirrors, by family name */
  mirrorsFamily: string;
}

export const curatedSets: CuratedSet[] = [
  {
    id: "interface",
    name: "Interface & UI",
    blurb: "Recorded and designed UI feedback — the real-world counterpart of the UI family.",
    mirrorsFamily: "UI & Interface",
  },
  {
    id: "impacts",
    name: "Impacts & Materials",
    blurb: "Physical hits and material tells — compare against the modal synthesis in Melee & Materials.",
    mirrorsFamily: "Melee & Materials",
  },
  {
    id: "weapons",
    name: "Weapons & Sci-Fi",
    blurb: "Designed weapon fire and sci-fi energy — the sampled cousins of the Weapons family.",
    mirrorsFamily: "Weapons",
  },
];

export const curatedSounds: CuratedSound[] = [];
```

- [ ] **Step 2: Write the validation suite** (`tests/curated.test.ts`)

```ts
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
```

Note: the license floor is enforced by the `CuratedLicense` type at compile
time; the suite covers everything types can't.

- [ ] **Step 3: Create `public/curated/interface/`, `public/curated/impacts/`, `public/curated/weapons/` (empty) and run `npm test`** — the bijection and set-size tests FAIL (empty manifest, 0 < 8). This is the red state Task 4 turns green; commit anyway with tests marked `it.skip` ONLY on the set-size test? **No** — instead commit Tasks 2+3+4 together only when green, OR temporarily gate: run the suite with `curatedSounds.length === 0` guard? **Decision: do not commit Task 2 alone.** Proceed straight into Tasks 3 and 4; the commit lands when the suite is green. (Directories with no committed files don't exist in git anyway.)

---

### Task 3: Credits renderer

**Files:**
- Create: `src/curated/credits.ts`
- Test: `tests/credits.test.ts`

**Interfaces:**
- Consumes: `CuratedSet`, `CuratedSound` from `src/curated/manifest`
- Produces: `renderCredits(set: CuratedSet, sounds: CuratedSound[]): string`

- [ ] **Step 1: Write failing tests** (`tests/credits.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { renderCredits } from "../src/curated/credits";
import type { CuratedSet, CuratedSound } from "../src/curated/manifest";

const set: CuratedSet = {
  id: "interface",
  name: "Interface & UI",
  blurb: "b",
  mirrorsFamily: "UI & Interface",
};

const cc0: CuratedSound = {
  id: "ui.click-01", name: "Click 01", setId: "interface",
  file: "curated/interface/click-01.wav", durMs: 120,
  source: "https://kenney.nl/assets/interface-sounds",
  author: "Kenney", license: "CC0-1.0", attributionRequired: false,
  note: "a clean reference click",
};

const ccby: CuratedSound = {
  ...cc0, id: "ui.blip-02", name: "Blip 02",
  file: "curated/interface/blip-02.wav",
  source: "https://opengameart.org/content/example",
  author: "Jane Doe", license: "CC-BY-4.0", attributionRequired: true,
};

describe("renderCredits", () => {
  const text = renderCredits(set, [cc0, ccby]);

  it("names the set and the lab", () => {
    expect(text).toContain("Interface & UI");
    expect(text).toContain("kai sound lab");
  });
  it("credits every sound with author, source, and license", () => {
    for (const s of [cc0, ccby]) {
      expect(text).toContain(s.name);
      expect(text).toContain(s.author);
      expect(text).toContain(s.source);
      expect(text).toContain(s.license);
    }
  });
  it("notes the modifications made during curation", () => {
    expect(text.toLowerCase()).toContain("converted to wav");
  });
  it("spells out the CC BY attribution obligation", () => {
    expect(text).toContain("requires attribution");
  });
});
```

- [ ] **Step 2: Run** — FAIL (module not found)
- [ ] **Step 3: Implement** (`src/curated/credits.ts`)

```ts
import type { CuratedSet, CuratedSound } from "./manifest";

const LICENSE_URLS: Record<string, string> = {
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-3.0": "https://creativecommons.org/licenses/by/3.0/",
};

/** Render the CREDITS.txt bundled into a set's zip download. */
export function renderCredits(set: CuratedSet, sounds: CuratedSound[]): string {
  const lines: string[] = [
    `${set.name} — curated sound set`,
    `from kai sound lab (https://kai-denrei.github.io/kai-sound-lab/)`,
    ``,
    `All sounds are open-licensed by their original creators. Files were`,
    `converted to WAV and peak-normalized for this set; no other changes.`,
    `Sounds under CC BY require attribution when you ship them — the`,
    `per-sound credits below are ready to copy into your own credits.`,
    ``,
  ];
  for (const s of sounds) {
    lines.push(
      `${s.name}`,
      `  by ${s.author}`,
      `  source: ${s.source}`,
      `  license: ${s.license} (${LICENSE_URLS[s.license]})` +
        (s.attributionRequired ? " — requires attribution" : ""),
      ``,
    );
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run** — credits tests PASS (curated suite still red until Task 4)
- [ ] **Step 5: No commit yet** — lands with Task 4's green suite.

---

### Task 4: Source and curate the audio

**Files:**
- Create: `public/curated/<set>/*.wav` (8–12 per set)
- Modify: `src/curated/manifest.ts` (fill `curatedSounds`)

**Interfaces:**
- Consumes: manifest types from Task 2.
- Produces: green `tests/curated.test.ts`; real content for Task 5's UI.

- [ ] **Step 1: Download source packs to the scratchpad** (NOT the repo)

Kenney packs are CC0; page → direct zip. Verify each URL at execution time
(kenney.nl layout changes); packs of interest:
- Interface Sounds — https://kenney.nl/assets/interface-sounds
- Impact Sounds — https://kenney.nl/assets/impact-sounds
- Sci-Fi Sounds — https://kenney.nl/assets/sci-fi-sounds

Optionally 1–2 CC BY items from OpenGameArt with direct file URLs to
exercise the attribution path live; record exact asset page + author.
If no clean CC BY item is found quickly, launch all-CC0 (the CC BY code
path stays covered by unit tests).

- [ ] **Step 2: Select 8–12 per set for contrast with the synth presets.**
  Audition via `afplay`; prefer variety (clicks/confirms/errors for
  interface; wood/metal/glass/soft for impacts; laser/heavy/UI-energy for
  weapons).

- [ ] **Step 3: Convert to normalized WAV** (per file)

```bash
ffmpeg -i in.ogg -af "loudnorm=I=-16:TP=-1" -ar 44100 -sample_fmt s16 out.wav
```

Use 44.1kHz 16-bit; mono stays mono. Name files `<short-id>.wav` matching
manifest ids. Get durations for manifest entries:

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 out.wav
```

- [ ] **Step 4: Fill `curatedSounds` in the manifest** — one entry per file,
  every field real (author "Kenney", pack page as `source`, license
  `"CC0-1.0"`, `attributionRequired: false`, and a one-line curatorial
  `note` written after actually listening).

- [ ] **Step 5: Run `npm test`** — the full curated suite PASSES.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Curated library: manifest, credits, three launch sets (Kenney CC0)"`

---

### Task 5: Library tab UI

**Files:**
- Create: `src/app/library.ts`
- Modify: `index.html` (tab button + view), `src/app/main.ts` (tab names, boot), `src/app/style.css` (license badge, attribution block, download button)

**Interfaces:**
- Consumes: `curatedSets`, `curatedSounds`, `renderCredits`, `buildZip`, `drawWaveform`; DOM ids `#library-list`, `#library-panel`, `#view-library`.
- Produces: `initLibrary(ensureCtx: () => AudioContext): void` — called once at boot from `main.ts`.

- [ ] **Step 1: index.html** — nav gains
  `<button class="tab" data-tab="library" aria-pressed="false">Library</button>`
  after the Lab tab, and a view after `#view-lab`:

```html
<div id="view-library" class="view is-hidden">
  <aside class="rack" aria-label="Curated library">
    <p class="rack-label" id="library-label"></p>
    <ul id="library-list"></ul>
  </aside>
  <main class="panel" id="library-panel">
    <p class="empty">Select a sound from a curated set.</p>
  </main>
</div>
```

- [ ] **Step 2: main.ts** — widen the tab union and boot the library:

```ts
type TabName = "lab" | "library" | "devlog";
function showTab(name: TabName): void {
  $("#view-lab").classList.toggle("is-hidden", name !== "lab");
  $("#view-library").classList.toggle("is-hidden", name !== "library");
  $("#view-devlog").classList.toggle("is-hidden", name !== "devlog");
  // …existing button toggle loop unchanged
}
// at boot, after buildRack(selectAndAudition):
initLibrary(ensureCtx);
```

`markPlaying` and `sweepPlayhead` move from main.ts into a small shared
module `src/app/scope.ts` exported to both tabs (main.ts keeps behavior
identical; library.ts reuses them). `ensureCtx` is passed in, not duplicated.

- [ ] **Step 3: library.ts** — full implementation:

```ts
import { curatedSets, curatedSounds, type CuratedSound } from "../curated/manifest";
import { renderCredits } from "../curated/credits";
import { buildZip } from "../lib";
import { drawWaveform } from "./draw";
import { markPlaying, sweepPlayhead } from "./scope";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

const assetUrl = (file: string): string => `${import.meta.env.BASE_URL}${file}`;

/* raw bytes cache (zip downloads) and decoded cache (playback/thumbs) */
const bytesCache = new Map<string, Promise<Uint8Array>>();
const bufferCache = new Map<string, Promise<AudioBuffer>>();

function fetchBytes(file: string): Promise<Uint8Array> {
  let p = bytesCache.get(file);
  if (!p) {
    p = fetch(assetUrl(file)).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} fetching ${file}`);
      return new Uint8Array(await r.arrayBuffer());
    });
    bytesCache.set(file, p);
    p.catch(() => bytesCache.delete(file)); // allow retry after failure
  }
  return p;
}

function decodeSound(ctx: AudioContext, s: CuratedSound): Promise<AudioBuffer> {
  let p = bufferCache.get(s.id);
  if (!p) {
    // decodeAudioData detaches the buffer — copy so bytesCache stays valid
    p = fetchBytes(s.file).then((b) => ctx.decodeAudioData(b.slice().buffer));
    bufferCache.set(s.id, p);
    p.catch(() => bufferCache.delete(s.id));
  }
  return p;
}

const LICENSE_LABEL: Record<string, string> = {
  "CC0-1.0": "CC0",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-3.0": "CC BY 3.0",
};

export function initLibrary(ensureCtx: () => AudioContext): void {
  const list = $("#library-list");
  $("#library-label").textContent =
    `${curatedSets.length} curated sets · ${curatedSounds.length} sounds`;

  curatedSets.forEach((set, idx) => {
    const sounds = curatedSounds.filter((s) => s.setId === set.id);
    const group = document.createElement("li");
    group.className = "rack-group" + (idx === 0 ? "" : " is-collapsed");

    const head = document.createElement("button");
    head.className = "rack-family";
    head.setAttribute("aria-expanded", String(idx === 0));
    head.innerHTML = `<span class="chev" aria-hidden="true">▾</span>
      ${set.name} <span class="fam-count">${sounds.length}</span>`;

    const sub = document.createElement("ul");
    sub.className = "family-presets";

    let hydrated = idx === 0;
    const hydrate = () => {
      for (const s of sounds) buildCard(sub, s, ensureCtx);
      addDownloadRow(sub, set.id);
    };
    if (hydrated) hydrate();

    head.addEventListener("click", () => {
      const collapsed = group.classList.toggle("is-collapsed");
      head.setAttribute("aria-expanded", String(!collapsed));
      if (!collapsed && !hydrated) { hydrated = true; hydrate(); }
    });

    group.append(head, sub);
    list.append(group);
  });
}

function buildCard(list: HTMLElement, s: CuratedSound, ensureCtx: () => AudioContext): void {
  const li = document.createElement("li");
  const card = document.createElement("button");
  card.className = "preset-card";
  card.dataset.id = s.id;

  const canvas = document.createElement("canvas");
  canvas.width = 88;
  canvas.height = 36;

  const text = document.createElement("span");
  text.innerHTML = `<span class="p-name">${s.name}</span><br>
    <span class="p-meta">${LICENSE_LABEL[s.license]} · ${Math.round(s.durMs)}ms</span>`;

  card.append(canvas, text);
  card.addEventListener("click", () => {
    document
      .querySelectorAll("#library-list .preset-card")
      .forEach((c) => c.classList.toggle("is-selected", c === card));
    selectAndAudition(s, ensureCtx);
  });
  li.append(card);
  list.append(li);

  void decodeSound(ensureCtx(), s)
    .then((buf) => drawWaveform(canvas, buf))
    .catch(() => card.classList.add("is-unavailable"));
}

function addDownloadRow(list: HTMLElement, setId: string): void {
  const set = curatedSets.find((x) => x.id === setId)!;
  const sounds = curatedSounds.filter((s) => s.setId === setId);
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.className = "set-download";
  btn.textContent = `Download set (${sounds.length} WAV + credits)`;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Packing…";
    try {
      const files = await Promise.all(
        sounds.map(async (s) => ({
          name: `${set.id}/${s.file.split("/").pop()}`,
          data: await fetchBytes(s.file),
        })),
      );
      files.push({
        name: `${set.id}/CREDITS.txt`,
        data: new TextEncoder().encode(renderCredits(set, sounds)),
      });
      const zipBytes = buildZip(files);
      const a = document.createElement("a");
      // fresh ArrayBuffer keeps Blob happy about buffer typing
      a.href = URL.createObjectURL(new Blob([zipBytes.slice().buffer], { type: "application/zip" }));
      a.download = `kai-sound-lab-${set.id}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      btn.textContent = "Downloaded ✓";
    } catch {
      btn.textContent = "Failed — click to retry";
    } finally {
      btn.disabled = false;
    }
  });
  li.append(btn);
  list.append(li);
}

function playBuffer(ctx: AudioContext, buf: AudioBuffer): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

function selectAndAudition(s: CuratedSound, ensureCtx: () => AudioContext): void {
  showDetail(s, ensureCtx);
  void decodeSound(ensureCtx(), s).then((buf) => {
    playBuffer(ensureCtx(), buf);
    markPlaying($("#lib-scope-wrap"), s.durMs);
    sweepPlayhead($("#lib-scope-wrap"), $("#lib-playhead"), s.durMs);
  });
}

function showDetail(s: CuratedSound, ensureCtx: () => AudioContext): void {
  const set = curatedSets.find((x) => x.id === s.setId)!;
  const panel = $("#library-panel");
  panel.innerHTML = `
    <div class="panel-sticky">
      <div class="detail-head">
        <h2>${s.name}</h2>
        <span class="d-id">${s.id} · ${Math.round(s.durMs)}ms</span>
      </div>
      <div class="scope-wrap" id="lib-scope-wrap">
        <canvas class="scope" id="lib-scope"></canvas>
        <div class="playhead" id="lib-playhead" aria-hidden="true"></div>
      </div>
      <div class="controls">
        <button id="lib-play">Play</button>
        <a class="secondary btn-link" href="${assetUrl(s.file)}" download>Download WAV</a>
      </div>
    </div>
    <div class="attribution">
      <span class="license-badge">${LICENSE_LABEL[s.license]}</span>
      <p class="attr-line">by <strong>${s.author}</strong> ·
        <a href="${s.source}" target="_blank" rel="noopener">source</a>
        ${s.attributionRequired ? " · attribution required when shipped" : " · public domain (credited as provenance)"}</p>
    </div>
    <p class="edu-summary">${s.note}</p>
    <div class="section-label">Set</div>
    <p class="set-line">${set.name} — ${set.blurb}
      <em>Mirrors the <strong>${set.mirrorsFamily}</strong> synth family.</em></p>`;

  void decodeSound(ensureCtx(), s).then((buf) =>
    drawWaveform($("#lib-scope") as HTMLCanvasElement, buf),
  );

  $("#lib-play").addEventListener("click", () => {
    void decodeSound(ensureCtx(), s).then((buf) => {
      playBuffer(ensureCtx(), buf);
      markPlaying($("#lib-scope-wrap"), s.durMs);
      sweepPlayhead($("#lib-scope-wrap"), $("#lib-playhead"), s.durMs);
    });
  });
}
```

- [ ] **Step 4: style.css** — add (match the existing visual language):

```css
.license-badge {
  font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid var(--accent, #7fd); border-radius: 3px;
  padding: 1px 6px; opacity: 0.85;
}
.attribution { margin: 0.6rem 0 0.2rem; }
.attr-line { margin: 0.35rem 0; font-size: 0.85rem; opacity: 0.85; }
.set-download {
  width: 100%; margin: 6px 0; padding: 6px 8px; font-size: 0.8rem;
}
.preset-card.is-unavailable { opacity: 0.4; }
.btn-link { display: inline-flex; align-items: center; text-decoration: none; }
```

(Adjust to existing custom properties when editing — reuse the button and
panel styles already present rather than inventing new ones.)

- [ ] **Step 5: Verify** — `npm test` PASS, `npm run build` PASS, `npm run dev`
  and exercise: tab switch, set expand (lazy hydrate), card select
  (audition + scope + attribution), Play, per-sound Download WAV link,
  set zip download → `unzip -t` the result.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Library tab: curated sets with attribution and zip downloads"`

---

### Task 6: Devlog, deploy, verify live

**Files:**
- Modify: `DEVLOG.md` (new dated entry: decisions + insights from this feature)

- [ ] **Step 1: Write the devlog entry** — decisions (separate tab, manifest as
  source of truth, STORE zip) and at least one insight worth reading.
- [ ] **Step 2: `npm test && npm run build`** — both green.
- [ ] **Step 3: Commit, push** — Pages workflow runs tests + deploys.
- [ ] **Step 4: Verify live** — `gh run watch` to completion; curl the deployed
  manifest'd WAV URL (200) and the page; spot-check in a single headless
  browser if available, then close it.
- [ ] **Step 5: Notify operator on Telegram** with the live URL and set counts.
