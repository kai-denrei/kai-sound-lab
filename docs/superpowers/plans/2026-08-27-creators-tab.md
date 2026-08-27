# Creators Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third tab, Creators, organised creator → pack → sounds, shipping Daniel SoundsGood's *Free Laser Weapon Sound Library* (50 WAVs). Its audio is gitignored, so the same build auditions locally and degrades to attribution-plus-link publicly.

**Architecture:** A separate `src/creators/manifest.ts` alongside (never merged into) `src/curated/manifest.ts`, so the Library's CC0/CC-BY licence floor stays enforced. Generic asset plumbing moves out of `library.ts` into `src/app/audio-assets.ts` for two consumers. `src/app/creators.ts` is the tab controller, modelled on `library.ts`, with a single HEAD probe per pack deciding hydrated-vs-link-out.

**Tech Stack:** existing vanilla TS + Vite + vitest; `ffmpeg` (already on PATH) for the one-time import. No new deps.

Design: `docs/superpowers/specs/2026-08-27-creators-tab-design.md`

## Global Constraints

- No new runtime dependencies.
- `tests/curated.test.ts` is **untouched**; the CC0/CC-BY floor does not move.
- No zip download for creator packs — the licence grants use, not redistribution.
- `public/creators/**/*.wav` is gitignored; `git status` must stay clean of WAVs.
- `tests/creators.test.ts` passes both with the audio present and absent.
- Licence terms are quoted verbatim in the manifest, never paraphrased.
- Branch `creators-tab`; commit per task; `npm test` green before every commit; never push until the ship task.

Standard commit trailers (append to every commit message):

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014rsDTNw63XD6CUx26DkeN7
```

---

### Task 1: Gitignore, import script, and the audio on disk

**Files:**
- Modify: `.gitignore`
- Create: `scripts/import-creator-pack.sh`, `public/creators/README.md`
- Produces (untracked): `public/creators/daniel-soundsgood/laser-weapons/*.wav`

- [ ] **Step 1:** Add `public/creators/**/*.wav` to `.gitignore` *before* any WAV is written, so the bytes can never be staged by accident.
- [ ] **Step 2:** Write `scripts/import-creator-pack.sh <src-dir> <creator-id> <pack-id>`. For each `*.wav`: `ffmpeg -i` → 44.1 kHz / stereo / `pcm_s16le`, no normalisation. Rename `snake_case_NNN.wav` → `kebab-case-NN.wav` preserving the original ordinal, with the group prefixes mapped: `continuous_beam`→`beam`, `heavy_blast`→`heavy-blast`, `light_blast`→`light-blast`, `reloading`→`reload`, `weapon_handling`→`handling`. Print a manifest stub (id, name, file, durMs, group) to stdout.
- [ ] **Step 3:** Run it against the extracted archive. Verify 50 files out, format `(1, 2, 44100, 16)`, and `git status --porcelain` shows no `.wav`.
- [ ] **Step 4:** `public/creators/README.md` — how to rehydrate: download from itch, extract, run the script. This is the committed counterpart to the uncommitted bytes.

Commit: `Creator pack import: script, gitignore, and local audio`

---

### Task 2: The creators manifest

**Files:**
- Create: `src/creators/manifest.ts`
- Test: `tests/creators.test.ts`

**Interfaces (produces):**

```ts
export interface Creator      { id, name, handle, url, blurb, creditLine }
export interface CreatorPack  { id, creatorId, name, url, blurb,
                                licenseSummary, licenseTerms }
export interface CreatorSound { id, packId, name, file, durMs, group, note,
                                mirrorsPresetId? }
export const creators: Creator[]
export const creatorPacks: CreatorPack[]
export const creatorSounds: CreatorSound[]
export const soundsInPack: (packId: string) => CreatorSound[]
export const packsByCreator: (creatorId: string) => CreatorPack[]
```

- [ ] **Step 1: Failing test** (`tests/creators.test.ts`). Structural assertions run always: unique ids; every pack resolves to a creator and every sound to a pack; `file` matches `^creators/<creatorId>/<packId>/[a-z0-9-]+\.wav$`; creator `url` is `https://`; `creditLine`, `licenseSummary`, `licenseTerms` non-empty; every `mirrorsPresetId` resolves against `allPresets`. File assertions guarded by `it.skipIf(!existsSync(packDir))`: manifest↔disk bijection, and `durMs` within 20 ms of the RIFF header (reuse the `wavDurMs` helper shape from `curated.test.ts`).
- [ ] **Step 2:** Write the manifest — one creator, one pack, 50 sounds, `durMs` from the script's stub. Verbatim `licenseTerms`. A written `note` for each sound in the curatorial voice used by `curated/manifest.ts`.
- [ ] **Step 3:** Set `mirrorsPresetId` on only the sounds with a genuine `wpn.*` counterpart. Confirm each id exists before writing it.
- [ ] **Step 4:** `npm test` green.

Commit: `Creators manifest: Daniel SoundsGood laser weapon library`

---

### Task 3: Extract shared asset plumbing

**Files:**
- Create: `src/app/audio-assets.ts`
- Modify: `src/app/library.ts` (delete the moved functions, import them instead)

**Interfaces (produces):**

```ts
export const assetUrl: (file: string) => string
export function fetchBytes(file: string): Promise<Uint8Array>
export function decodeBuffer(ctx: AudioContext, key: string, file: string): Promise<AudioBuffer>
export function assetExists(file: string): Promise<boolean>   // HEAD probe, cached
export function playBuffer(ctx: AudioContext, buf: AudioBuffer): Voice
```

- [ ] **Step 1:** Move `assetUrl`, `bytesCache`/`fetchBytes`, the decode cache, and `playBuffer` verbatim. `decodeSound(ctx, s)` becomes `decodeBuffer(ctx, s.id, s.file)` so it is not tied to `CuratedSound`.
- [ ] **Step 2:** Add `assetExists` — cached `HEAD`, resolving `false` on non-ok or throw.
- [ ] **Step 3:** Rewrite `library.ts`'s call sites. Behaviour must be identical; this is a move, not a redesign.
- [ ] **Step 4:** `npm test` green — `tests/curated.test.ts` and the rest unchanged and passing.

Commit: `Extract audio-assets: shared fetch, decode, and playback plumbing`

---

### Task 4: Crosslink and tab scaffolding

**Files:**
- Modify: `src/app/crosslink.ts` (`TabId` gains `"creators"`), `src/app/main.ts` (`TabName`, `showTab`, `registerTabSwitcher`), `index.html` (tab button + `#view-creators`)

- [ ] **Step 1:** `TabId = "lab" | "library" | "creators"`.
- [ ] **Step 2:** `main.ts` — `showTab` toggles three views generically rather than by three hardcoded lines; `registerTabSwitcher` passes the tab through instead of collapsing it to lab/library.
- [ ] **Step 3:** `index.html` — `<button class="tab" data-tab="creators">Creators</button>` and a `#view-creators` view with `#creators-list` rack and `#creators-panel`.
- [ ] **Step 4:** Verify all three tabs switch and the existing lab↔library jump still works.

Commit: `Creators tab scaffolding: view, tab button, crosslink id`

---

### Task 5: The creators tab controller

**Files:**
- Create: `src/app/creators.ts`
- Modify: `src/app/main.ts` (call `initCreators(ensureCtx)`)

- [ ] **Step 1:** Build the rack: creator group (collapsible) → pack group (collapsible) → group divider rows → cards. Lazy hydration per pack, as `library.ts` does per set.
- [ ] **Step 2:** On first hydration of a pack, `await assetExists(firstSound.file)`. Cache per pack.
- [ ] **Step 3 (present):** Cards hydrate with waveform thumbs and click-to-audition; panel gets scope, playhead, Play, Stop, Download WAV, and A/B where `mirrorsPresetId` is set — reusing `addVoice`/`stopAll` from `transport.ts`.
- [ ] **Step 4 (absent):** Cards render `.is-linkout` with no fetch attempted; panel shows the creator block and *Get the pack from Daniel →*. Verify by temporarily moving the pack directory aside — no 404s in the network log beyond the single probe.
- [ ] **Step 5:** Pinned pack info row: itch link plus click-to-copy credit line.
- [ ] **Step 6:** `registerJump("creators", …)` mirroring the library's hydrate-then-find behaviour.

Commit: `Creators tab: rack, availability probe, audition, attribution`

---

### Task 6: Styles

**Files:**
- Modify: `src/app/style.css`

- [ ] **Step 1:** `.rack-subgroup` divider rows and the creator subline (handle under the creator name).
- [ ] **Step 2:** `.preset-card.is-linkout` — visually distinct from `.is-unavailable` (which means "broken"); this means "hosted elsewhere, deliberately".
- [ ] **Step 3:** `.creator-block` for the heavier attribution panel: verbatim terms in a quote treatment, copyable credit line.
- [ ] **Step 4:** Check the 760px breakpoint still holds with three tabs in the faceplate.

Commit: `Creators tab styling`

---

### Task 7: Ship

- [ ] **Step 1:** `npm test` green; `npm run build` clean (`tsc --noEmit` included).
- [ ] **Step 2:** Confirm `git status --porcelain` shows no WAV and `git ls-files public/creators` lists only `README.md`.
- [ ] **Step 3:** Verify the built `dist/` contains no creator audio.
- [ ] **Step 4:** DEVLOG.md entry in the established voice.
- [ ] **Step 5:** Merge to `main`.
