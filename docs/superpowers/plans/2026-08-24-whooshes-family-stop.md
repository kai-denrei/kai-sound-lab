# Whooshes Family + STOP Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a four-preset Whooshes synth family (1:1 mirrors of curated whooshes) and a STOP button that silences all playback in both tabs.

**Architecture:** `buildGraph` returns a `Voice` handle that can stop its nodes click-free; a small app-layer `transport` registry tracks live voices and stops them all. No schema changes — the whoosh presets use existing primitives (filter `env`, `ampEnv.holdMs`, `lfo`).

**Tech Stack:** existing vanilla TS + Vite + vitest; playwright (from `/Users/minikai/Dev/bjj-jikohyouka/node_modules/playwright/index.mjs`) for browser checks. No new deps.

## Global Constraints

- No new runtime dependencies; no recipe-schema changes.
- `renderOffline` (export path) must be unaffected by the Voice change.
- `Voice.stop()` is click-free (short gain ramp) and idempotent (guarded).
- STOP is stop-all across both tabs (one shared AudioContext).
- Preset ids prefixed `whoosh.`; family id `whooshes`, name `Whooshes`.
- Branch `whooshes-stop`; commit per task with the standard trailers; `npm test` green before every commit; never push until the ship task.

Standard commit trailers (append to every commit message):

```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01C5SoEUonHtpfufaNT3Wdh4
```

---

### Task 1: Voice handle in the graph builder

**Files:**
- Modify: `src/lib/render.ts` (buildLayer collects nodes; buildGraph returns Voice), `src/lib/index.ts` (export Voice type via `export * from "./render"` — already present, confirm)
- Test: `tests/voice.test.ts`

**Interfaces (produces):**

```ts
export interface Voice { stop(fadeMs?: number): void }
// buildGraph(...) : Voice   (was void)
```

- [ ] **Step 1: Failing test** (`tests/voice.test.ts`) — proves stop() silences the tail. Uses OfflineAudioContext (available in Node? NO — jsdom/node lacks WebAudio). Therefore test the CONTRACT and the ramp math without a real context, using a minimal fake:

```ts
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
```

- [ ] **Step 2: Run** `npm test` — FAIL (buildGraph returns void; `.stop` undefined).
- [ ] **Step 3: Implement.** In `src/lib/render.ts`:
  - Add near the top (after imports): `export interface Voice { stop(fadeMs?: number): void }`.
  - Change `buildLayer` signature to accept a collector:
    `function buildLayer(ctx, layer, layerIndex, recipe, v, out, when, sinks: AudioScheduledSourceNode[]): void`.
    Where it currently does `source.start(t0); source.stop(t0 + durS + 0.05);`, add `sinks.push(source);` and inside the `if (layer.lfo)` block after `lfoOsc.stop(...)` add `sinks.push(lfoOsc);`.
  - Change `buildGraph` to return `Voice`:

```ts
export function buildGraph(
  ctx: BaseAudioContext,
  recipe: SfxRecipe,
  opts: PlayOptions = {},
): Voice {
  validateRecipe(recipe);
  const when = opts.when ?? ctx.currentTime;
  const seed = opts.seed ?? recipe.seed;
  const amount = opts.variationAmount ?? 0;
  const v = computeVariation(recipe, seed, amount);

  const master = new GainNode(ctx, { gain: recipe.master.gain });
  const pan = new StereoPannerNode(ctx, { pan: recipe.master.pan ?? 0 });
  master.connect(pan);
  pan.connect(opts.destination ?? ctx.destination);

  const sinks: AudioScheduledSourceNode[] = [];
  recipe.layers.forEach((layer, i) => buildLayer(ctx, layer, i, recipe, v, master, when, sinks));

  let stopped = false;
  return {
    stop(fadeMs = 20) {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      const end = now + fadeMs / 1000;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, end);
      } catch { /* param already torn down */ }
      for (const node of sinks) {
        try { node.stop(end); } catch { /* already stopped/ended */ }
      }
    },
  };
}
```

  - `renderOffline` already calls `buildGraph(...)` as a statement; leave it — the returned Voice is ignored.
- [ ] **Step 4: Run** `npm test` — all pass (existing + 2 new). `npm run build` green.
- [ ] **Step 5: Commit** `"Voice handle: buildGraph returns a click-free stop()"`.

---

### Task 2: Transport registry

**Files:**
- Create: `src/app/transport.ts`
- Test: `tests/transport.test.ts`

**Interfaces (produces):**

```ts
export function addVoice(v: Voice, durationMs: number): void;
export function stopAll(): void;
export function activeCount(): number; // test seam
```

- [ ] **Step 1: Failing test** (`tests/transport.test.ts`):

```ts
import { describe, expect, it, vi } from "vitest";
import { addVoice, stopAll, activeCount } from "../src/app/transport";

describe("transport", () => {
  it("stopAll stops every registered voice and empties the set", () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    addVoice(a, 1000);
    addVoice(b, 1000);
    expect(activeCount()).toBe(2);
    stopAll();
    expect(a.stop).toHaveBeenCalledOnce();
    expect(b.stop).toHaveBeenCalledOnce();
    expect(activeCount()).toBe(0);
  });
  it("stopAll with nothing registered is a no-op", () => {
    expect(() => stopAll()).not.toThrow();
    expect(activeCount()).toBe(0);
  });
  it("a voice auto-deregisters after its duration", () => {
    vi.useFakeTimers();
    const a = { stop: vi.fn() };
    addVoice(a, 500);
    expect(activeCount()).toBe(1);
    vi.advanceTimersByTime(700);
    expect(activeCount()).toBe(0);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run** — FAIL (module missing).
- [ ] **Step 3: Implement** (`src/app/transport.ts`):

```ts
import type { Voice } from "../lib";

/**
 * Live-playback registry shared across tabs (one AudioContext). STOP calls
 * stopAll(); voices also auto-deregister when they end naturally, so a set
 * membership never outlives its sound by more than ~100ms.
 */

const active = new Set<Voice>();

export function addVoice(v: Voice, durationMs: number): void {
  active.add(v);
  // bare setTimeout (global): the test env is node (no `window`), and in the
  // browser the global timer is fine too.
  setTimeout(() => active.delete(v), durationMs + 100);
}

export function stopAll(): void {
  for (const v of active) {
    try { v.stop(); } catch { /* already gone */ }
  }
  active.clear();
}

export function activeCount(): number {
  return active.size;
}
```

Note: confirmed the vitest environment is **node** (no `environment` set in
`vite.config.ts`), so `window` is undefined in tests — the implementation
above already uses the global `setTimeout`. `vi.useFakeTimers()` intercepts
the global timer, so the auto-deregister test works as written.

- [ ] **Step 4: Run** `npm test` green; **Step 5: Commit** `"Transport registry: stopAll across live voices"`.

---

### Task 3: STOP buttons + route playback through the transport

**Files:**
- Modify: `src/app/main.ts` (lab), `src/app/library.ts` (library), `src/app/style.css`

**Interfaces (consumes):** `addVoice`, `stopAll` from `./transport`; `Voice` shape from buildGraph/playBuffer.

- [ ] **Step 1: main.ts (lab).**
  - Import: `import { addVoice, stopAll } from "./transport";`.
  - Every `buildGraph(ctx, recipe, {...})` call in `showDetail` (the `#btn-play` handler, the `#btn-family` five-play loop) and in `selectAndAudition` now returns a Voice — capture it and `addVoice(voice, recipe.master.durMs)`. For the `#btn-family` loop, register each of the five voices with `addVoice(voice, recipe.master.durMs)`.
  - The A/B `#btn-ab` handler holds a `setTimeout` id for the queued second sound. Store it in a closure variable `let abTimer: number | undefined` scoped to `showDetail`, and its synth-play also registers its voice.
  - Add the STOP button to the `showDetail` template, right after the Play button in `.controls`:
    `<button id="btn-stop" class="secondary">Stop</button>`.
  - Wire it after other handlers:

```ts
$("#btn-stop").addEventListener("click", () => {
  if (abTimer !== undefined) { clearTimeout(abTimer); abTimer = undefined; }
  stopAll();
  scopeWrap.classList.remove("is-playing");
});
```

  (Use the existing `scopeWrap` const in `showDetail`.)
- [ ] **Step 2: library.ts.**
  - Import: `import { addVoice, stopAll } from "./transport";`.
  - Refactor `playBuffer` to return a Voice and route through a gain node:

```ts
function playBuffer(ctx: AudioContext, buf: AudioBuffer): import("../lib").Voice {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  let stopped = false;
  return {
    stop(fadeMs = 20) {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      const end = now + fadeMs / 1000;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, end);
      } catch { /* torn down */ }
      try { src.stop(end); } catch { /* already stopped */ }
    },
  };
}
```

  - Every `playBuffer(...)` call site captures the voice and registers it:
    `const voice = playBuffer(ensureCtx(), buf); addVoice(voice, <durMs>);`
    (curated `s.durMs` in the audition/play paths; for the A/B synth side, the mirrored preset's `master.durMs`).
  - The library A/B handler (`#lib-btn-ab`) similarly holds an `abTimer` closure var; register both voices.
  - Add STOP to the library `showDetail` template after `#lib-play`:
    `<button id="lib-btn-stop" class="secondary">Stop</button>`, and:

```ts
$("#lib-btn-stop").addEventListener("click", () => {
  if (abTimer !== undefined) { clearTimeout(abTimer); abTimer = undefined; }
  stopAll();
  $("#lib-scope-wrap").classList.remove("is-playing");
});
```

  - Export note: `Voice` is exported from `../lib` (Task 1). Import the type where needed.
- [ ] **Step 3: style.css.** If Play and Stop crowd, no new rule needed (both are `.controls button`). Add only if spacing looks off at build time; otherwise skip.
- [ ] **Step 4: Run** `npm test && npm run build` green. **Step 5: Commit** `"STOP button: stop-all playback in both tabs"`.

---

### Task 4: Whooshes synth family + mirror pairs

**Files:**
- Create: `src/presets/whooshes.ts`
- Modify: `src/presets/index.ts`, `src/curated/mirrors.ts`, `tests/lib.test.ts` (family-size pin if present)

**Interfaces (produces):** `whooshPresets: SfxRecipe[]` ids `whoosh.swish`, `whoosh.air`, `whoosh.wind`, `whoosh.sweep`; family `{ id: "whooshes", name: "Whooshes", presets: whooshPresets }`.

- [ ] **Step 1: Write `src/presets/whooshes.ts`.** Study `src/presets/engines.ts` for voice/shape. Four presets; flagship shown, others follow the sketch table with the same structure and house voice. All `provenance: proceduralProvenance as provenance`, `version "0.1.0"`, `variation { pitchPct: 4, gainDb: 1, timingMs: 2 }`, sensible taxonomy (`diegesis "diegetic"`, `function "movement"`, `event "whoosh"`).

```ts
import type { SfxRecipe } from "../lib/recipe";
import { proceduralProvenance as provenance } from "./shared";

/**
 * Whooshes family. Motion rendered as filtered noise: a bandpass sweep is
 * the object cutting through air, the amplitude arc is its pass. Each preset
 * 1:1-mirrors a recording in the curated whooshes set (see mirrors.ts).
 */

export const whooshPresets: SfxRecipe[] = [
  {
    id: "whoosh.swish",
    name: "Whoosh — Swish",
    version: "0.1.0",
    seed: 701,
    taxonomy: { diegesis: "diegetic", function: "movement", event: "whoosh", tags: ["whoosh", "swish", "blade"] },
    perception: { brightness: 0.7, weight: 0.2, roughness: 0.3, tonality: 0.1, urgency: 0.4 },
    education: {
      summary:
        "Mirrors whooshes/swish-short.wav (artisticdude, OGA). A blade cut is a band of noise sweeping up fast: bandpass climbing 800→3000 Hz in under 200 ms with a sharp amplitude arc. Listen for what the recording has that this doesn't — a faint metallic edge from the real blade the pure noise can't supply.",
      claims: [
        { text: "A fast upward spectral sweep reads as an accelerating pass; direction of the sweep sets the sense of approach vs. recede.", basis: "evidence", source: "spectral-motion perception; report §movement" },
        { text: "Short, bright, tonally empty = 'swish' is a learned game-audio shorthand for a light fast object.", basis: "convention" },
      ],
    },
    provenance,
    layers: [
      {
        id: "air",
        source: { kind: "noise", color: "white" },
        durMs: 200,
        ampEnv: { attackMs: 8, decayMs: 180, peak: 0.6, curve: "exp" },
        filter: { type: "bandpass", freqHz: 800, q: 1.2, env: { toHz: 3000, timeMs: 160, curve: "exp" } },
      },
    ],
    master: { gain: 0.85, durMs: 220 },
    variation: { pitchPct: 4, gainDb: 1, timingMs: 2 },
  },
  // whoosh.air (seed 702), whoosh.wind (703), whoosh.sweep (704) per the table below
];
```

Remaining three, same structure, house-voice education each naming its recording:

| id / name / seed | layers |
|---|---|
| `whoosh.air` "Whoosh — Air", 702, master durMs 760, mirrors whooshes/air-whoosh.wav (pyranostudios) | `body`: brown noise, durMs 720, ampEnv attack 40 / decay 700 / peak 0.6 / exp, filter bandpass 300 q0.9 env→1400Hz/560ms exp · `hiss`: pink noise, durMs 720, ampEnv attack 60 / decay 660 / peak 0.25 / exp, filter highpass 900 |
| `whoosh.wind` "Whoosh — Wind", 703, master durMs 4000, mirrors whooshes/wind-whoosh-loop.wav (SketchMan3) | `gust`: brown noise, durMs 4000, ampEnv attack 400 / holdMs 3200 / decay 400 / peak 0.7 / lin, filter lowpass 700, lfo {target filter, rateHz 0.5, depth 400, shape sine} · `air`: pink noise, durMs 4000, ampEnv attack 500 / holdMs 3100 / decay 400 / peak 0.3 / lin, lfo {target gain, rateHz 0.35, depth 0.4, shape sine} |
| `whoosh.sweep` "Whoosh — Sweep", 704, master durMs 1200, mirrors whooshes/erase-sweep.wav (Fupi) | `riser`: pink noise, durMs 1180, ampEnv attack 500 / decay 680 / peak 0.6 / exp, filter bandpass 400 q1.4 env→4000Hz/900ms exp |

- [ ] **Step 2: Register** in `src/presets/index.ts`: import `whooshPresets`, append `{ id: "whooshes", name: "Whooshes", presets: whooshPresets }` to `families` (after engines).
- [ ] **Step 3: Mirror pairs** — append to `mirrors` in `src/curated/mirrors.ts`:

```ts
{ curatedId: "whooshes.swish-short", presetId: "whoosh.swish" },
{ curatedId: "whooshes.air-whoosh", presetId: "whoosh.air" },
{ curatedId: "whooshes.wind-whoosh-loop", presetId: "whoosh.wind" },
{ curatedId: "whooshes.erase-sweep", presetId: "whoosh.sweep" },
```

- [ ] **Step 4: Family-size pin.** `tests/lib.test.ts` (~line 105) has an ordered pin:
  `expect(families.map((f) => [f.id, f.presets.length])).toEqual([ …, ["engines", 6] ])`.
  Append `["whooshes", 4]` as the last array element (matching the family
  registration order in `index.ts`). Run `npm test`.
- [ ] **Step 5: Run** `npm test` (preset validation + mirror registry both directions now cover whooshes) and `npm run build` green. Audition via `npm run dev` if convenient; keep documented params unless a layer clips.
- [ ] **Step 6: Commit** `"Whooshes synth family: four archetype mirrors"`.

---

### Task 5: Verify, devlog, ship (coordinator)

- [ ] **Step 1: Browser verification** (playwright via the bjj-jikohyouka path; preview on :4173):
  - Lab: expand Whooshes family, select `whoosh.wind` (4s), press Play, then after ~500ms press Stop — assert the scope loses `is-playing` and (best-effort) no error; select each whoosh, thumbnail non-blank; A/B row present on `whoosh.swish`, A/B plays.
  - Library: play `engines.engine-low` (a long one) then Stop; press A/B then Stop mid-sequence — no console errors.
  - Assert zero `pageerror`/console errors across the run.
- [ ] **Step 2: DEVLOG entry** — the whoosh family (motion as filtered-noise sweep), the STOP/Voice architecture (fire-and-forget → handle), one insight from an A/B.
- [ ] **Step 3:** `npm test && npm run build`; commit devlog; merge `whooshes-stop` to main `--no-ff`; push; `gh run watch` to green.
- [ ] **Step 4:** Live checks: page 200; confirm the app still serves. Telegram the operator (whoosh family + STOP live); vault history addendum.
