# Curated FX Library Tab — Design

Date: 2026-08-24
Status: approved direction (Approach A, "parallel rack"), autonomous execution per operator

## Purpose

A third tab ("library") holding curated sets of existing open-source sound
effects. It serves two purposes at once:

1. **Reference corpus** — real-world sounds sit beside the synthesized
   presets as study material: compare a recorded UI click against the synth
   click, hear what the recipes are reaching for.
2. **Usable asset library** — visitors can download a whole set as a zip
   with a generated `CREDITS.txt`, ready to drop into a game.

Everything is attributed — even CC0 material, as provenance.

## Decisions (operator-confirmed)

| Question | Decision |
|---|---|
| Purpose | Both reference corpus and downloadable library, from day one |
| Hosting | Audio files committed in the repo under `public/curated/`, served by Pages |
| License floor | CC0 and CC BY only; no NC, no SA |
| Curation | Manifest-driven, manual; a test gates every file on a complete manifest entry |
| Launch scope | 2–3 sets mirroring the synth families, ~8–12 sounds each |
| Architecture | Approach A: parallel rack — same card/waveform/scope UI as the lab tab |

## Architecture

The library tab mirrors the lab rack's anatomy. Files are fetched and
decoded to `AudioBuffer`s, so every existing visualization and playback
path (waveform thumbnails, scope with playhead sweep) works unchanged on
recordings. The identity boundary stays clean: synthesized recipes in the
lab, curated recordings in the library.

### Units

- **`src/curated/manifest.ts`** — the single source of truth. Typed
  `CuratedSound[]` entries: `id`, `name`, `set`, `file` (path under
  `public/curated/`), `durMs`, `source` (URL), `author`, `license`
  (`"CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0"`), `attributionRequired`,
  `note` (why it's in the set — the curatorial voice). Set definitions
  (`CuratedSet[]`: `id`, `name`, `blurb`, mirrors-family pointer) live in
  the same module. TypeScript checking makes malformed entries a compile
  error; a vitest suite enforces the file↔manifest bijection and license
  floor.
- **`public/curated/<set>/<id>.wav`** — the audio. Mono or stereo WAV,
  normalized peak, converted from source OGG/WAV via ffmpeg during
  curation (not at build time — the repo holds finished files).
- **`src/lib/zip.ts`** — minimal ZIP writer (STORE method, CRC-32). Pure
  function `buildZip(entries: {name, data}[]): Blob`-shaped API operating
  on `Uint8Array`s so it is unit-testable in vitest without a browser.
  WAV doesn't compress meaningfully, so STORE is the honest choice and
  keeps the implementation ~100 lines with zero dependencies.
- **`src/app/library.ts`** — the tab's UI: set groups (collapsible, like
  rack families), cards with waveform thumbnails, audition-on-select into
  the shared scope, an attribution pane (author, linked source, license
  badge, curatorial note), per-set "download zip" button. Consumes
  `manifest.ts`, `zip.ts`, and the existing `draw.ts` helpers.
- **`CREDITS.txt` generation** — a pure function in `src/curated/credits.ts`
  that renders the manifest entries of a set into attribution text
  (author, title, source URL, license, modifications note: "converted to
  WAV, peak-normalized"). Used by the zip download; also unit-tested.

### Data flow

manifest.ts → library.ts renders set groups → user expands a set →
files fetch lazily (`fetch` + `decodeAudioData`, cached in a Map like the
existing `thumbCache`) → thumbnails draw → select auditions through the
shared scope. "Download set" → fetch raw bytes (cache) → `credits.ts`
renders CREDITS.txt → `zip.ts` packs WAVs + CREDITS.txt → anchor download.

### Error handling

- Fetch/decode failure renders the card in a disabled state with a retry
  affordance; one bad file must not break the set.
- The manifest test suite fails the build if: a file exists without an
  entry, an entry points at a missing file, a license is outside the
  floor, or `attributionRequired` disagrees with the license kind.

### Launch content

Three sets mirroring synth families, sourced from Kenney (CC0) with
OpenGameArt CC BY items where they earn their place (and to exercise the
attribution-required path):

1. **Interface & UI** — mirrors the UI family (Kenney Interface Sounds / UI Audio)
2. **Impacts & Materials** — mirrors Melee & Materials (Kenney Impact Sounds)
3. **Weapons & Sci-Fi** — mirrors Weapons (Kenney Sci-Fi Sounds)

~8–12 sounds per set, chosen for contrast with the synthesized presets,
each with a one-line curatorial note.

### Testing

- `zip.ts`: byte-level tests — local file header signatures, CRC-32
  vectors, central directory offsets; round-trip via `unzip -t` is a
  manual verification step, the unit tests assert the format invariants.
- `credits.ts`: golden-string tests for CC0 and CC BY entries.
- `manifest.ts`: bijection + license-floor suite (reads `public/curated/`
  from vitest's node context).
- UI: existing pattern — the app layer stays thin; logic lives in lib and
  is tested there.

### Out of scope (YAGNI)

- Freesound API integration, ingest tooling — revisit when curation rhythm is known.
- Per-sound download buttons (the set zip covers it; individual files are
  directly linkable anyway since they're static assets).
- Search/filtering within the library.
- CC BY-SA or link-out-only entries.
