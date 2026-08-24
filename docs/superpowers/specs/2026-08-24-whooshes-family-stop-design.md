# Whooshes Synth Family + STOP Button — Design

Date: 2026-08-24
Status: approved (4 archetype mirrors; stop-all in both tabs)

## Purpose

Two features in one cycle:

1. **Whooshes synth family** — four synthesized presets that 1:1 mirror
   four curated whoosh recordings, extending the Library↔Lab comparison to
   motion sounds. Same mirror machinery as Engines.
2. **STOP button** — real playback interruption. Today `buildGraph` and the
   library's `playBuffer` fire-and-forget, so a sustained sound (the 4s wind
   preset, a wind-loop recording, an A/B sequence) cannot be stopped. STOP
   silences everything currently sounding, in both tabs.

## Decisions (operator-confirmed)

| Question | Decision |
|---|---|
| Mirror count | 4 archetype mirrors (swish, air whoosh, wind loop, sweep) |
| STOP scope | Stop-all, both Lab and Library detail panes |
| Synthesis | No new primitive — filter `env`, `ampEnv.holdMs`, and `lfo` (all from Engines) suffice |

## Whooshes family

Four presets in `src/presets/whooshes.ts`, family
`{ id: "whooshes", name: "Whooshes", presets: whooshPresets }` registered
after Engines in `src/presets/index.ts`. Preset id prefix `whoosh.`.

| id / name | mirrors (curated id) | synthesis sketch |
|---|---|---|
| `whoosh.swish` "Whoosh — Swish" | `whooshes.swish-short` | white-noise layer, ~200ms, bandpass filter with `env` sweeping 800→3000Hz fast, sharp amp arc (attack ~8ms, short decay). The rising bandpass is the blade accelerating. |
| `whoosh.air` "Whoosh — Air" | `whooshes.air-whoosh` | brown+pink noise, ~700ms, bandpass `env` sweep in a lower band (~300→1400Hz), slower attack, longer decay — heavier, more air. |
| `whoosh.wind` "Whoosh — Wind" | `whooshes.wind-whoosh-loop` | sustained ~4000ms brown noise, lowpass with a slow **filter LFO** (~0.5Hz, few-hundred-Hz depth) for gusting, gentle gain LFO, `holdMs` sustain. Reuses the engine sustain primitives. |
| `whoosh.sweep` "Whoosh — Sweep" | `whooshes.erase-sweep` | ~1200ms riser: pink noise, bandpass `env` climbing dramatically (~400→4000Hz), amplitude swelling then releasing — a transition sweep. |

Each preset's `education.summary` names its recording and states one audible
gap to listen for; one `evidence` + one `convention` claim in the house
voice. `provenance` is `procedural-original`. Exact parameters are
implementation-time sound design within these sketches.

Mirror registry (`src/curated/mirrors.ts`): append four `MirrorPair`s:

```ts
{ curatedId: "whooshes.swish-short",     presetId: "whoosh.swish" },
{ curatedId: "whooshes.air-whoosh",      presetId: "whoosh.air" },
{ curatedId: "whooshes.wind-whoosh-loop", presetId: "whoosh.wind" },
{ curatedId: "whooshes.erase-sweep",     presetId: "whoosh.sweep" },
```

The existing mirror test validates both directions and uniqueness; A/B rows
and cross-links appear automatically.

## STOP button

### Voice handle (`src/lib/render.ts`)

`buildGraph` return type changes from `void` to `Voice`:

```ts
export interface Voice {
  /** Ramp master gain to 0 over fadeMs (default 20) then stop all nodes. */
  stop(fadeMs?: number): void;
}
```

Implementation: `buildLayer` collects every `AudioScheduledSourceNode` it
creates (the layer `source` and any `lfoOsc`) into an array passed down from
`buildGraph`. `buildGraph` returns a `Voice` whose `stop()`:

1. `master.gain.cancelScheduledValues(now)`,
   `setValueAtTime(master.gain.value, now)`,
   `linearRampToValueAtTime(0, now + fadeMs/1000)` — click-free.
2. After the ramp, `stop(now + fadeMs/1000)` on each collected node, each in
   a `try/catch` (stopping an already-stopped/ended node throws; ignore).

`renderOffline` calls `buildGraph` and ignores the return — export path
unchanged. The lib layer never touches the DOM or any registry.

### Transport registry (`src/app/transport.ts`, new)

Session-level coordination, app layer (owns mutable live-playback state):

```ts
import type { Voice } from "../lib";
export function addVoice(v: Voice, durationMs: number): void;
export function stopAll(): void;
```

- `addVoice` adds `v` to a module `Set<Voice>` and schedules auto-removal
  after `durationMs + 100ms` (a natural-end cleanup; a stale entry is
  harmless because `stop()` is guarded).
- `stopAll` calls `v.stop()` on every member, then clears the set.

Both tabs share the one `AudioContext` (`ensureCtx` in main.ts, passed into
`initLibrary`), so one registry covers both.

### Library voice (`src/app/library.ts`)

`playBuffer` refactors to return a `Voice`: wrap the `AudioBufferSourceNode`
in a `GainNode` (source → gain → destination); `stop()` ramps the gain and
stops the source. Every call site registers the voice with
`addVoice(voice, durMs)`.

### Lab wiring (`src/app/main.ts`)

Every `buildGraph(ctx, recipe, opts)` call keeps the returned voice and
`addVoice(voice, recipe.master.durMs)`. The `Play ×5 varied` handler
registers each of its five voices.

### UI

Both detail-pane templates gain a STOP button immediately after Play:
`<button id="btn-stop" class="secondary">Stop</button>` (lab) and
`#lib-btn-stop` (library). Handler → `stopAll()` and remove the scope
`is-playing` glow immediately (`scopeWrap.classList.remove("is-playing")`).
Reuse existing `.controls button.secondary` styling; no new CSS beyond a
possible width tweak.

## Testing

- **Voice/stop (offline, node-safe):** build a sustained recipe in an
  `OfflineAudioContext`, call `voice.stop(20)` at ~100ms, render the full
  length, assert RMS of samples after ~150ms is ≈ 0 (silenced), while
  samples before are non-zero (it did play first).
- **buildGraph contract:** returns an object with a `stop` function.
- **Mirror registry:** existing test now covers 10 pairs (6 engines + 4
  whooshes); no new test needed beyond the data.
- **Preset validation:** existing "all presets validate" test covers the
  whoosh family automatically; update any pinned family-size assertion.
- **Browser (headless):** STOP silences a playing synth in the Lab and a
  playing recording in the Library; STOP kills a running A/B mid-sequence;
  the whoosh family renders with non-blank thumbnails; a whoosh A/B plays
  both sources.

## Error handling

- `Voice.stop()` guards each node stop in `try/catch` — double-stop, or
  stopping a node that already ended, is a silent no-op.
- `stopAll()` with nothing playing is a no-op.
- STOP pressed mid-A/B: the queued second sound of an A/B is started by a
  `setTimeout`; STOP cannot un-schedule that timer from the transport alone.
  Therefore the A/B handlers must capture their timeout id and clear it on a
  STOP. Implement by having each pane's STOP handler also clear any pending
  A/B timeout the pane is holding (a module/closure ref), in addition to
  `stopAll()`.

## Out of scope (YAGNI)

- Pause/resume, seek, per-voice stop buttons.
- A global transport bar or stop-all affordance outside the detail panes.
- Bidirectional Doppler pass-by primitive (none of the four archetypes needs it).
- Looping playback UI for the wind preset (auditioned as a one-shot of its full length).
