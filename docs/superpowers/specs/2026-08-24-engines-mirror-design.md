# Engines & Motors — Curated Set + Mirrored Synth Family

Date: 2026-08-24
Status: approved direction (Approach A: LFO primitive + 1:1 mirrors)

## Purpose

Deepen the Library↔Lab comparison with engines: a dedicated curated set of
sustained engine/motor recordings, and a new synthesized "Engines" family
whose presets are explicit 1:1 counterparts of specific recordings. The
pairing is the product: each preset's education notes describe what its
recording does that the synthesis chases.

## Decisions (operator-confirmed)

| Question | Decision |
|---|---|
| Engine scope | Sci-fi + mechanical mix (Kenney remainders + 2–3 real motors from OpenGameArt, per-item CC0/CC BY vetting) |
| Structure | Dedicated pair: "Engines & Motors" Library set + "Engines" synth family; the 3 engine sounds move out of Weapons & Sci-Fi; Weapons backfilled to ≥8 |
| Mirror style | 1:1 named counterparts |
| A/B | Cross-links between detail panes + back-to-back A/B playback button |
| Synthesis | Approach A: add an LFO primitive to the recipe schema (detune-beating still welcome inside presets as an honest technique) |

## Architecture

### 1. LFO primitive (`src/lib/recipe.ts`, `src/lib/render.ts`)

New optional per-layer modulation:

```ts
export type LfoTarget = "gain" | "freq" | "filter";
export interface LfoSpec {
  target: LfoTarget;
  rateHz: number;   // 0.05–50
  depth: number;    // target-specific semantics, ≥ 0 (see below)
  shape: OscType;   // sine | triangle | square | sawtooth
}
// Layer gains: lfo?: LfoSpec
```

Depth semantics:
- `gain` — modulation index 0..1: layer gain swings between `base·(1−depth)` and `base` (never negative, never above base).
- `freq` — cents: oscillator detune swings ±depth cents. Only valid on osc layers.
- `filter` — Hz: filter frequency swings ±depth Hz. Only valid on layers with a filter; clamp implied by validator rule below.

Validation rules (added to the existing recipe validator, with tests):
- `freq` target on a noise layer → error.
- `filter` target on a layer without a filter → error.
- `rateHz` outside [0.05, 50] → error.
- `depth` < 0, or > 1 for `gain` target → error.
- `filter` depth ≥ filter freqHz → error (would sweep through 0 Hz).

**Addendum (found at planning):** `AmpEnv` gains optional `holdMs?: number`
(default 0) — attack to peak, hold at peak for `holdMs`, then decay. The
existing envelope always decays to zero immediately after attack, which
cannot express a steady engine bed. Backwards compatible; validator rejects
negative values.

Rendering: both paths already share the WebAudio graph builder, so the LFO
is implemented once — an `OscillatorNode(shape, rateHz)` through a scaling
`GainNode` into the target `AudioParam` (`gain.gain` offset-arranged for
the gain semantics above, `osc.detune`, `filter.frequency`). Node lifetime
matches the layer's.

### 2. Engines synth family (`src/presets/engines.ts`)

Six presets, each a named 1:1 mirror (sustained, durMs 3000–5000):

| Preset (id) | Mirrors (curated id) | Sketch |
|---|---|---|
| `eng.idle-low` Low Idle | `engines.engine-low` | brown noise lowpassed + slow gain LFO throb + detuned sine pair at ~55Hz |
| `eng.circular` Circular Engine | `engines.engine-circular` | bandpassed noise with 4–6Hz gain LFO (the rotation) + tonal core with freq LFO |
| `eng.thruster` Thruster | `engines.thruster` | white+pink noise, highpass, fast shallow gain flutter + slow filter LFO |
| `eng.space-small` Small Drive | `engines.space-small` | square osc through resonant filter LFO + light noise bed |
| `eng.space-large` Large Drive | `engines.space-large` | low saw pair beating + sub sine, slow filter sweep LFO |
| `eng.motor` Electric Motor | `engines.motor` (OGA mechanical) | narrow bandpass saw at mains-ish pitch, freq LFO wow, brown noise floor |

Exact parameters are implementation-time sound design; the education notes
for each preset must name its recording and state the specific gap to
listen for. Family registered in `src/presets/index.ts` after Weapons.
(If execution-time vetting finds no clean OGA motor, `eng.motor` mirrors a
fourth Kenney engine variant instead — the 1:1 rule holds either way.)

### 3. Curated set changes (`src/curated/manifest.ts`, `public/curated/`)

- New set `engines` ("Engines & Motors", mirrorsFamily: "Engines").
- Move `weapons/thruster.wav`, `weapons/engine-circular.wav`,
  `weapons/engine-low.wav` → `public/curated/engines/` (ids become
  `engines.thruster`, `engines.engine-circular`, `engines.engine-low`;
  slugs `engine-circular`/`engine-low` simplify to `circular`? **No** —
  keep existing slugs; only the directory and setId change).
- Add ~6 new: Kenney Sci-Fi `spaceEngineSmall`, `spaceEngineLarge`,
  `spaceEngine` variants (CC0) as `space-small`, `space-large`,
  `space-mid`, plus 2–3 real motors/engines from OpenGameArt vetted
  per-item (CC0 preferred, CC BY accepted with full attribution fields)
  as `motor`, `motor-2`… Target: 9–10 sounds in the set.
- Weapons backfill: add `laser-burst` (another Kenney laserSmall variant)
  → Weapons & Sci-Fi lands on 8.
- Same curation pipeline as before: ffmpeg peak-normalize to 44.1k s16 WAV.

### 4. Mirror registry (`src/curated/mirrors.ts`)

```ts
export interface MirrorPair { curatedId: string; presetId: string }
export const mirrors: MirrorPair[] = [ /* 6 pairs */ ];
export const mirrorForCurated: (id: string) => MirrorPair | undefined;
export const mirrorForPreset: (id: string) => MirrorPair | undefined;
```

One file owns the relationship. Tests: every `curatedId` exists in the
manifest, every `presetId` exists in `allPresets`, no id appears twice.

### 5. A/B UI (`src/app/crosslink.ts`, `library.ts`, `main.ts`)

- `crosslink.ts` — tiny registry breaking the main↔library import cycle:
  `registerJump(tab: "lab" | "library", fn: (id: string) => void)` and
  `jumpTo(tab, id)` which switches the tab (via a registered tab-switcher)
  and invokes the selector. `main.ts` registers a select-preset-by-id
  function (finds the rack card, expands its family group, clicks it);
  `library.ts` registers the curated equivalent.
- Library detail pane, when a mirror exists: a "mirror" row —
  `synth mirror: <preset name>` link (jumps to Lab) and an `A/B` button:
  plays the recording (scope sweep as today), then after its durMs + 250ms
  renders the mirrored preset offline and plays it, sweeping the same
  scope. Button disabled while a sequence runs.
- Lab detail pane, when a mirror exists: same row in reverse
  (`recorded mirror: <name>`, A/B plays synth first, then recording).
- No mirror → row absent. No other UI changes.

### 6. Testing

- LFO validator rules: one test per rule (valid + each invalid case).
- Mirror registry: existence both directions + uniqueness.
- Curated suite: unchanged code; it re-validates the moved files, new set
  size (9–10), and Weapons at 8 automatically.
- Browser verification (headless, like last time): engines set renders,
  A/B button plays both sources sequentially without console errors,
  cross-links land on the right card in the right tab, lab regression.

### 7. Error handling

- A/B with the synth render failing → button reverts with "Failed — retry";
  recording-only playback unaffected.
- Cross-link to an id whose card isn't built yet (collapsed family/set):
  the jump function expands the group first, then selects.

## Out of scope (YAGNI)

- Looping playback UI (engines are auditioned as one-shots of their full length).
- LFO-on-LFO, multiple LFOs per layer, LFO phase control.
- Freesound integration; bulk OGA ingestion tooling.
- Moving any non-engine sounds between sets.
