# Engines & Motors + Mirrored Synth Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An LFO/hold primitive in the synthesis engine, a 6-preset "Engines" synth family, a curated "Engines & Motors" Library set (3 moved + ~6 new sounds), a mirror registry pairing them 1:1, and A/B cross-links in both detail panes.

**Architecture:** LFO and `holdMs` extend the recipe schema and the single shared graph builder (`buildLayer`), so offline render and live playback stay one code path. Pairing lives in one registry file (`src/curated/mirrors.ts`), consumed by both tabs through a tiny `crosslink.ts` that breaks the main↔library import cycle.

**Tech Stack:** existing vanilla TS + Vite + vitest; ffmpeg for curation; playwright (from `/Users/minikai/Dev/bjj-jikohyouka/node_modules/playwright/index.mjs`) for browser verification.

## Global Constraints

- License floor: `"CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0"`; OGA items vetted per-item; attribution fields complete for every entry.
- LFO bounds: `rateHz` in [0.05, 50]; `depth ≥ 0`; `gain` depth ≤ 1; `freq` target osc-only; `filter` target requires filter and `depth < filter.freqHz`.
- Set sizes: every curated set 8–12 sounds (existing test enforces).
- Engines presets are 1:1 mirrors; education notes must name their recording.
- No new runtime dependencies. Commit per task; `npm test` green before each commit.

---

### Task 1: LFO + holdMs primitives

**Files:**
- Modify: `src/lib/recipe.ts` (types + validator), `src/lib/render.ts:57-140` (buildLayer)
- Test: `tests/lfo.test.ts`

**Interfaces (produces):**

```ts
export type LfoTarget = "gain" | "freq" | "filter";
export interface LfoSpec { target: LfoTarget; rateHz: number; depth: number; shape: OscType }
// Layer: lfo?: LfoSpec
// AmpEnv: holdMs?: number
```

- [ ] **Step 1: Failing tests** (`tests/lfo.test.ts`) — validator-level (node-safe; audio wiring is browser-verified in Task 6):

```ts
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
```

- [ ] **Step 2: Run** `npm test` — FAIL (lfo/holdMs unknown, validator silent).

- [ ] **Step 3: Implement types** in `src/lib/recipe.ts` — after `PitchEnv`:

```ts
export type LfoTarget = "gain" | "freq" | "filter";

/**
 * Periodic modulation — the primitive that makes sustained textures move.
 * Depth semantics per target: gain = index 0..1 (swings base·(1−depth)..base),
 * freq = ±cents of detune, filter = ±Hz around the filter frequency.
 */
export interface LfoSpec {
  target: LfoTarget;
  rateHz: number;
  depth: number;
  shape: OscType;
}
```

`AmpEnv` gains `/** Hold at peak between attack and decay. */ holdMs?: number;`
`Layer` gains `lfo?: LfoSpec;`

Validator additions inside the layer loop of `validateRecipe`:

```ts
if (layer.ampEnv.holdMs !== undefined && layer.ampEnv.holdMs < 0)
  fail(`layer "${layer.id}" holdMs must be >= 0`);
if (layer.lfo) {
  const { target, rateHz, depth } = layer.lfo;
  if (rateHz < 0.05 || rateHz > 50)
    fail(`layer "${layer.id}" lfo rateHz out of 0.05..50`);
  if (depth < 0) fail(`layer "${layer.id}" lfo depth must be >= 0`);
  if (target === "gain" && depth > 1)
    fail(`layer "${layer.id}" gain lfo depth out of 0..1`);
  if (target === "freq" && layer.source.kind !== "osc")
    fail(`layer "${layer.id}" freq LFO requires an osc source`);
  if (target === "filter" && !layer.filter)
    fail(`layer "${layer.id}" filter LFO requires a filter`);
  if (target === "filter" && layer.filter && depth >= layer.filter.freqHz)
    fail(`layer "${layer.id}" filter lfo depth must be < filter freqHz`);
}
```

- [ ] **Step 4: Implement rendering** in `src/lib/render.ts` `buildLayer`:

holdMs — replace the envelope block (`const endT = …` region):

```ts
const holdS = (layer.ampEnv.holdMs ?? 0) / 1000;
const decayStart = t0 + attackS + holdS;
const endT = decayStart + decayMs / 1000;
if (curve === "exp") {
  gain.gain.setValueAtTime(peakGain, decayStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, endT);
} else {
  gain.gain.setValueAtTime(peakGain, decayStart);
  gain.gain.linearRampToValueAtTime(0, endT);
}
```

LFO — after `head.connect(gain); gain.connect(out);`, before `source.start`:

```ts
if (layer.lfo) {
  const { target, rateHz, depth, shape } = layer.lfo;
  const lfoOsc = new OscillatorNode(ctx, { type: shape, frequency: rateHz });
  const scale = new GainNode(ctx, { gain: 0 });
  lfoOsc.connect(scale);
  if (target === "gain") {
    // env drives gain.gain to peakGain; recenter so output swings
    // peakGain·(1−depth) .. peakGain: subtract depth/2, modulate ±depth/2.
    const mod = new GainNode(ctx, { gain: 1 - depth / 2 });
    // reroute: head → mod → gain instead of head → gain
    head.disconnect(gain);
    head.connect(mod);
    mod.connect(gain);
    scale.gain.value = depth / 2;
    scale.connect(mod.gain);
  } else if (target === "freq" && source instanceof OscillatorNode) {
    scale.gain.value = depth; // cents
    scale.connect(source.detune);
  } else if (target === "filter" && filterNode) {
    scale.gain.value = depth; // Hz
    scale.connect(filterNode.frequency);
  }
  lfoOsc.start(t0);
  lfoOsc.stop(t0 + durS + 0.05);
}
```

This requires keeping a `filterNode` reference: change the filter block to
`const f = new BiquadFilterNode(…)` → assign to a `let filterNode: BiquadFilterNode | undefined` declared before the block.

- [ ] **Step 5: Run** `npm test` — all pass (35 existing + 7 new).
- [ ] **Step 6: Commit** `git add -A && git commit -m "Engine primitives: per-layer LFO and amp-envelope hold"`

---

### Task 2: Curated set — move, source, backfill

**Files:**
- Move: `public/curated/weapons/{thruster,engine-circular,engine-low}.wav` → `public/curated/engines/`
- Create: `public/curated/engines/{space-small,space-mid,space-large,motor,…}.wav`, `public/curated/weapons/laser-burst.wav`
- Modify: `src/curated/manifest.ts`

**Interfaces:** curated ids consumed by Task 4's mirrors: `engines.engine-low`, `engines.engine-circular`, `engines.thruster`, `engines.space-small`, `engines.space-large`, `engines.motor`.

- [ ] **Step 1: Move the three engine WAVs** (`git mv`), update their manifest entries: `setId: "engines"`, `file: "curated/engines/<slug>.wav"`, id prefix `engines.`.
- [ ] **Step 2: Add the `engines` set** to `curatedSets`:

```ts
{
  id: "engines",
  name: "Engines & Motors",
  blurb: "Sustained engines from sci-fi drives to real motors — the recordings the Engines synth family mirrors 1:1.",
  mirrorsFamily: "Engines",
},
```

- [ ] **Step 3: Source new sounds.** Kenney Sci-Fi pack is already in the scratchpad (`packs/kenney_sci-fi-sounds/Audio`): convert `spaceEngineSmall_001.ogg → space-small.wav`, `spaceEngine_002.ogg → space-mid.wav`, `spaceEngineLarge_000.ogg → space-large.wav`, and `laserSmall_004.ogg → ../weapons/laser-burst.wav` with the Task-4 pipeline from the previous feature (ffmpeg volumedetect → volume gain → 44.1k s16 WAV). For the mechanical side, search OpenGameArt (`opengameart.org/art-search-advanced?field_art_type_tid[]=13&keys=engine+loop`) for 2–3 CC0/CC BY motor/engine loops with direct file URLs; vet license per item on the asset page; record exact page URL + author + license in the manifest. Trim loops to ≤6s (`ffmpeg -t 6`). Fallback if nothing clean: use Kenney `thrusterFire_003` as `thruster-heavy` and `engineCircular_004` as `circular-2` — the set stays 8–10 and `eng.motor` mirrors `engines.thruster-heavy` instead (rename its manifest/mirror ids accordingly).
- [ ] **Step 4: Manifest entries** for every new file (same `kenney()` helper for Kenney items; OGA items written literal with their true license and `attributionRequired: license !== "CC0-1.0"`). Weapons keeps 8 sounds (7 + laser-burst). Engines lands 8–10. Write real curatorial notes.
- [ ] **Step 5: Run** `npm test` — curated suite green (bijection, sizes, durMs).
- [ ] **Step 6: Commit** `git add -A && git commit -m "Curated: Engines & Motors set (moved + new), weapons backfill"`

---

### Task 3: Engines synth family

**Files:**
- Create: `src/presets/engines.ts`
- Modify: `src/presets/index.ts` (register family)
- Test: covered by existing validation in `tests/lib.test.ts` if it validates `allPresets`; otherwise Task 4's mirror test pins ids.

**Interfaces (produces):** `enginePresets: SfxRecipe[]` with ids `eng.idle-low`, `eng.circular`, `eng.thruster`, `eng.space-small`, `eng.space-large`, `eng.motor`; family `{ id: "engines", name: "Engines", presets: enginePresets }`.

- [ ] **Step 1: Write `src/presets/engines.ts`.** Full code for the flagship mirror as the template:

```ts
import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Engines family. Every preset is a named 1:1 mirror of a recording in the
 * curated Engines & Motors set (see src/curated/mirrors.ts). These are the
 * first sustained textures in the library: the LFO primitive carries the
 * periodic movement that separates an engine from a drone.
 */

export const enginePresets: SfxRecipe[] = [
  {
    id: "eng.circular",
    name: "Engine — Circular",
    version: "0.1.0",
    seed: 601,
    taxonomy: {
      diegesis: "diegetic",
      function: "vehicle",
      event: "engine-loop",
      tags: ["engine", "scifi", "sustained", "rotary"],
    },
    perception: { brightness: 0.45, weight: 0.55, roughness: 0.6, tonality: 0.35, urgency: 0.2 },
    education: {
      summary:
        "Mirrors engines/engine-circular.wav (Kenney). The recording reads as 'rotating machine' because one band of noise swells and recedes about five times a second. Here that is literal: a 4.5 Hz sine LFO on a bandpassed pink-noise layer. Listen for what the recording has that this chases — its sweep is asymmetric (fast rise, slow fall), where a sine LFO is symmetric.",
      claims: [
        {
          text: "Periodic amplitude modulation at 3–8 Hz is heard as mechanical rotation; the same spectrum without modulation reads as a static drone.",
          basis: "evidence",
          source: "AM/roughness perception; report §engines",
        },
        {
          text: "A tonal core an octave-ish below the noise band 'motorizes' the texture — pure noise modulation alone reads as wind or waves.",
          basis: "convention",
        },
      ],
    },
    provenance,
    layers: [
      {
        id: "swoosh",
        source: { kind: "noise", color: "pink" },
        durMs: 4000,
        ampEnv: { attackMs: 300, holdMs: 3300, decayMs: 400, peak: 0.7, curve: "lin" },
        filter: { type: "bandpass", freqHz: 900, q: 2 },
        lfo: { target: "gain", rateHz: 4.5, depth: 0.85, shape: "sine" },
      },
      {
        id: "core",
        source: { kind: "osc", type: "triangle", freqHz: 220 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.2, curve: "lin" },
        filter: { type: "lowpass", freqHz: 1200 },
        lfo: { target: "freq", rateHz: 4.5, depth: 18, shape: "sine" },
      },
      {
        id: "sub",
        source: { kind: "osc", type: "sine", freqHz: 70 },
        durMs: 4000,
        ampEnv: { attackMs: 400, holdMs: 3200, decayMs: 400, peak: 0.3, curve: "lin" },
        lfo: { target: "gain", rateHz: 4.5, depth: 0.3, shape: "sine" },
      },
    ],
    master: { gain: 0.85, durMs: 4000 },
    variation: { pitchPct: 3, gainDb: 1, timingMs: 0 },
  },
  // …five more presets, same shape, from the table below
];
```

The remaining five presets follow the identical structure with these exact parameters (all: `version "0.1.0"`, `durMs 4000` per layer and master, amp env `attackMs 300–400 / holdMs = 4000 − attack − decay / decayMs 400 / curve "lin"`, `variation { pitchPct: 3, gainDb: 1, timingMs: 0 }`, education summary naming its recording plus one evidence + one convention claim in the same voice):

| id / name / seed | layers (source → filter → lfo, peak) |
|---|---|
| `eng.idle-low` "Engine — Low Idle", 602 | `rumble`: brown noise → lowpass 120 → gain LFO 1.2Hz d0.5 sine, p0.8 · `fund`: sine 52Hz, p0.25 · `beat`: sine 54.5Hz, p0.25 (2.5Hz beating, no LFO) |
| `eng.thruster` "Engine — Thruster", 603 | `roar`: white noise → highpass 300 → gain LFO 27Hz d0.25 triangle, drive 0.6, p0.6 · `body`: pink noise → bandpass 500 q1 → filter LFO 0.6Hz d300 sine, p0.6 · `sub`: brown noise → lowpass 150, p0.5 |
| `eng.space-small` "Engine — Small Drive", 604 | `whine`: square 640Hz → bandpass 1400 q3 → filter LFO 0.8Hz d500 sine, drive 0.4, p0.3, plus freq… **one LFO per layer**: keep filter LFO; add separate `wobble` layer: square 640Hz → lowpass 2000 → freq LFO 6Hz d30 sine, p0.12 · `bed`: pink noise → lowpass 800 → gain LFO 6Hz d0.2 sine, p0.35 |
| `eng.space-large` "Engine — Large Drive", 605 | `saw-a`: sawtooth 82Hz → lowpass 400, p0.3 · `saw-b`: sawtooth 84Hz → lowpass 400, p0.3 (beating) · `sub`: sine 41Hz → gain LFO 0.4Hz d0.3 sine, p0.5 · `wash`: brown noise → lowpass 500 → filter LFO 0.3Hz d200 sine, p0.4 |
| `eng.motor` "Motor — Electric", 606 | `hum`: sawtooth 120Hz → bandpass 240 q4 → freq LFO 0.7Hz d8 sine (wow), p0.35 · `brush`: white noise → bandpass 2400 q1.5 → gain LFO 47Hz d0.3 square (commutator), p0.15 · `floor`: brown noise → lowpass 200, p0.3 |

(If Task 2 fell back to all-Kenney, `eng.motor`'s education summary names the fallback recording; parameters unchanged.)

- [ ] **Step 2: Register** in `src/presets/index.ts`: import `enginePresets`, append `{ id: "engines", name: "Engines", presets: enginePresets }` to `families`.
- [ ] **Step 3: Run** `npm test` (preset validation flows through existing suite) and audition: `npm run dev`, play all six, adjust peaks only if a layer clips (keep documented values otherwise).
- [ ] **Step 4: Commit** `git add -A && git commit -m "Engines synth family: six 1:1 mirrors of the curated set"`

---

### Task 4: Mirror registry

**Files:**
- Create: `src/curated/mirrors.ts`
- Test: `tests/mirrors.test.ts`

**Interfaces (produces):**

```ts
export interface MirrorPair { curatedId: string; presetId: string }
export const mirrors: MirrorPair[];
export function mirrorForCurated(id: string): MirrorPair | undefined;
export function mirrorForPreset(id: string): MirrorPair | undefined;
```

- [ ] **Step 1: Failing test** (`tests/mirrors.test.ts`):

```ts
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
```

- [ ] **Step 2: Run** — FAIL (module missing).
- [ ] **Step 3: Implement** (`src/curated/mirrors.ts`):

```ts
/**
 * The 1:1 pairing between curated recordings and the synth presets that
 * mirror them. One file owns the relationship; tests/mirrors.test.ts
 * verifies both sides exist and neither repeats.
 */

export interface MirrorPair {
  curatedId: string;
  presetId: string;
}

export const mirrors: MirrorPair[] = [
  { curatedId: "engines.engine-low", presetId: "eng.idle-low" },
  { curatedId: "engines.engine-circular", presetId: "eng.circular" },
  { curatedId: "engines.thruster", presetId: "eng.thruster" },
  { curatedId: "engines.space-small", presetId: "eng.space-small" },
  { curatedId: "engines.space-large", presetId: "eng.space-large" },
  { curatedId: "engines.motor", presetId: "eng.motor" },
];

export const mirrorForCurated = (id: string): MirrorPair | undefined =>
  mirrors.find((m) => m.curatedId === id);
export const mirrorForPreset = (id: string): MirrorPair | undefined =>
  mirrors.find((m) => m.presetId === id);
```

(Adjust `engines.motor` to the fallback id if Task 2 used the fallback.)

- [ ] **Step 4: Run** `npm test` — PASS. **Step 5: Commit** `git commit -am "Mirror registry: curated↔preset 1:1 pairs"`

---

### Task 5: A/B UI + cross-links

**Files:**
- Create: `src/app/crosslink.ts`
- Modify: `src/app/main.ts` (register jumps, mirror row in showDetail), `src/app/library.ts` (register jumps, mirror row + A/B), `src/app/style.css`

**Interfaces (produces):**

```ts
// crosslink.ts
export type TabId = "lab" | "library";
export function registerTabSwitcher(fn: (tab: TabId) => void): void;
export function registerJump(tab: TabId, fn: (id: string) => void): void;
export function jumpTo(tab: TabId, id: string): void; // switches tab, then selects id
```

- [ ] **Step 1: crosslink.ts**

```ts
/** Cross-tab jump registry — breaks the main↔library import cycle. */

export type TabId = "lab" | "library";

let switchTab: ((tab: TabId) => void) | null = null;
const jumps = new Map<TabId, (id: string) => void>();

export function registerTabSwitcher(fn: (tab: TabId) => void): void {
  switchTab = fn;
}
export function registerJump(tab: TabId, fn: (id: string) => void): void {
  jumps.set(tab, fn);
}
export function jumpTo(tab: TabId, id: string): void {
  switchTab?.(tab);
  jumps.get(tab)?.(id);
}
```

- [ ] **Step 2: main.ts wiring**
  - `import { registerTabSwitcher, registerJump, jumpTo } from "./crosslink";`
    plus `import { mirrorForPreset } from "../curated/mirrors";` and
    `import { curatedSounds } from "../curated/manifest";`
  - After `initTabs()`: `registerTabSwitcher((tab) => showTab(tab === "lab" ? "lab" : "library"));`
  - After `buildRack(...)`: register the lab jump — find the card by
    `data-id`, expand its collapsed group, click it:

```ts
registerJump("lab", (id) => {
  const card = document.querySelector<HTMLButtonElement>(`#preset-list .preset-card[data-id="${id}"]`);
  if (!card) return;
  const group = card.closest(".rack-group");
  if (group?.classList.contains("is-collapsed"))
    group.querySelector<HTMLButtonElement>(".rack-family")?.click();
  card.click();
  card.scrollIntoView({ block: "nearest" });
});
```

  - In `showDetail(recipe)`: after the `.controls` div in the template, insert a
    mirror row when `mirrorForPreset(recipe.id)` resolves:

```ts
const mirror = mirrorForPreset(recipe.id);
const curated = mirror ? curatedSounds.find((s) => s.id === mirror.curatedId) : undefined;
// in template, after </div> of .controls:
${curated ? `<div class="mirror-row">
    <span class="section-label">recorded mirror</span>
    <a href="#" id="mirror-link">${curated.name} — ${curated.author}</a>
    <button id="btn-ab" class="secondary" title="Synth, then the recording it mirrors">A/B</button>
  </div>` : ""}
```

  - Handlers (guarded by `if (curated)`): `#mirror-link` →
    `jumpTo("library", curated.id)` (preventDefault). `#btn-ab` → play synth
    (existing `buildGraph` + `markPlaying`/`sweepPlayhead`), then after
    `recipe.master.durMs + 250` ms fetch-decode the curated sound via a new
    exported helper from library.ts (`auditionCurated(id): Promise<void>` —
    decodes, plays through `ensureCtx`, sweeps the *library* scope only if
    visible; here it just plays audio). Disable the button during the
    sequence; re-enable in `finally`.

- [ ] **Step 3: library.ts wiring** — mirror of Step 2:
  - Export `auditionCurated(id: string): Promise<void>` (find sound, `decodeSound`, `playBuffer`).
  - Register `registerJump("library", (id) => …)` — expand the set group if
    collapsed (triggers hydration), then click the card. Cards for a
    just-hydrated set exist synchronously after `hydrate()`, so click works.
  - In `showDetail(s)`: when `mirrorForCurated(s.id)` resolves to a preset
    (`allPresets.find`), render the same `.mirror-row` (`synth mirror:
    <preset name>`, `A/B` = recording first, then
    `renderOffline(preset)` → play buffer after `s.durMs + 250` ms).
  - Import `allPresets` from `../presets` and `renderOffline` from `../lib`.

- [ ] **Step 4: style.css**

```css
.mirror-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.7rem 0 0.2rem;
}
.mirror-row .section-label { margin: 0; }
.mirror-row a { font-size: 0.85rem; }
.mirror-row button { font-size: 0.75rem; padding: 3px 10px; }
```

(`.mirror-row button` inherits `.controls button` styles only inside
`.controls`; give it explicit padding/size as above and `class="secondary"`
styling comes from the existing `.controls button.secondary` — if that
selector doesn't match outside `.controls`, extend it:
`.controls button.secondary, .mirror-row button { … }` — check at
implementation and reuse, don't duplicate.)

- [ ] **Step 5: Run** `npm test && npm run build` — green.
- [ ] **Step 6: Commit** `git commit -am "A/B mirror rows and cross-tab jumps"`

---

### Task 6: Verify, devlog, deploy

**Files:**
- Modify: `DEVLOG.md`

- [ ] **Step 1: Browser verification** — extend the previous playwright script pattern (preview server on :4173, chromium from the bjj-jikohyouka node_modules): engines set renders with 8–10 cards; select `engines.engine-circular` → mirror row present; click A/B → no console errors during the sequence (assert `page.on("pageerror")` list empty after `durMs·2 + 1s` wait); mirror link jumps to Lab with the right card selected (`#detail-panel h2` text = "Engine — Circular"); lab-side A/B likewise; screenshot both panes.
- [ ] **Step 2: DEVLOG entry** — decisions (LFO primitive + holdMs, mirror registry, A/B) and an insight from actually comparing a pair.
- [ ] **Step 3:** `npm test && npm run build`, commit, merge `engines-mirror` branch to main (`--no-ff`), push.
- [ ] **Step 4:** `gh run watch` to green; curl the live page (200), one new engine WAV (200), and confirm `data-tab="library"` page still serves. Telegram the operator; vault history entry.
