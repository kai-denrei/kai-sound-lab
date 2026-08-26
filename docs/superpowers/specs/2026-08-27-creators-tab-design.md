# Creators tab — design

**Date:** 2026-08-27
**Status:** approved

## Problem

The Library tab holds curated sets under a hard licence floor: CC0 or CC BY,
nothing else, enforced by `tests/curated.test.ts`. That floor is what makes the
tab trustworthy — every set can be redistributed, zipped, and shipped.

Some sound work worth showing does not clear that floor. Daniel SoundsGood's
*Free Laser Weapon Sound Library* (50 WAVs, from
<https://danielsoundsgood.itch.io/laser-weapon-sound-library>) is licensed:

> non-exclusive license – you're free to use this library in your commercial games.

with the request to *"add @danielsoundsgood on your game credits"* and the
condition *"No license to claim as your own work."*

That is a **use** grant, not a **redistribution** grant. Re-hosting the WAVs on
the public site — and certainly zipping them for download — is not covered.
But the pack is worth auditioning against the synth `wpn.*` family locally, and
the creator is worth crediting publicly.

## Solution

A third tab, **Creators**, organised creator → pack → sounds. It carries its own
licence model — prose terms quoted verbatim, not an SPDX identifier — and its
audio is **gitignored**, so the same build is fully playable on a machine that
has the files and degrades to attribution-plus-link on one that does not.

The Library tab and its licence floor are untouched.

## Data model

`src/creators/manifest.ts`, deliberately parallel to `src/curated/manifest.ts`
rather than merged into it. Merging would force `curated.test.ts` to loosen its
licence floor, which is the one thing that must not happen.

```ts
interface Creator      { id, name, handle, url, blurb, creditLine }
interface CreatorPack  { id, creatorId, name, url, blurb,
                         licenseSummary, licenseTerms }
interface CreatorSound { id, packId, name, file, durMs, group, note,
                         mirrorsPresetId? }
```

- `licenseTerms` holds the creator's own words verbatim. Paraphrasing licence
  text into a badge is how attribution goes wrong; the quote is the artefact.
- `creditLine` is the string a game developer copies into their credits
  (`@danielsoundsgood`).
- `group` partitions a pack into readable runs — for this pack: `beam`,
  `heavy-blast`, `light-blast`, `reload`, `handling`.
- `mirrorsPresetId` is optional, set only where a sound has a genuine
  counterpart in the synth `wpn.*` family. It drives the A/B button, reusing
  the interaction the Library already has.

## Files and the gate

```
public/creators/daniel-soundsgood/laser-weapons/*.wav   gitignored
public/creators/README.md                               committed
scripts/import-creator-pack.sh                          committed
```

`.gitignore` gains `public/creators/**/*.wav`.

Because the bytes never enter the repo, **the import script is the only
surviving record of how they were made.** That is what justifies writing it for
what is nominally a one-time job: without it the local files are
unreproducible, and the next pack starts from nothing.

The script converts the extracted archive from 48 kHz / stereo / 32-bit float
to 44.1 kHz / stereo / 16-bit — matching the existing `public/curated/`
convention — renames `heavy_blast_001.wav` → `heavy-blast-01.wav`, and prints a
manifest stub. Original ordinals are preserved (`handling-12`, not
`handling-01`) so any file traces back to its source in the pack.

**No peak normalisation**, unlike the curated sets. This tab showcases a
creator's work; re-levelling their mix sits badly beside *"no license to claim
as your own work."*

Stereo is kept rather than folded to mono. Repo weight stopped being a
constraint the moment the audio was gitignored (~12 MB local, 0 committed).

## Availability detection

`src/app/creators.ts` fires a single `HEAD` request for a pack's first sound on
first hydration and caches the result:

- **present** → cards hydrate exactly as Library cards do: waveform thumbnail,
  click-to-audition, scope and playhead, Play / Stop, Download WAV, and A/B
  where `mirrorsPresetId` is set.
- **absent** → cards render in a link-out state, no further fetches are
  attempted, and the panel shows the creator block with a prominent
  *Get the pack from Daniel →*.

One probe rather than fifty 404s, so the public build's network log stays clean.
A probe that throws is treated as absent.

## Shared plumbing

`src/app/library.ts` is 341 lines, roughly half of which is generic asset
plumbing — `assetUrl`, `bytesCache`, `fetchBytes`, `decodeSound`, `playBuffer`.
`creators.ts` needs all of it.

Extract those into `src/app/audio-assets.ts`, imported by both. Nothing else in
`library.ts` changes; this is not a refactor of the library tab, only the
removal of code that now has two consumers.

`src/app/crosslink.ts` `TabId` gains `"creators"`, and `main.ts`'s
`registerTabSwitcher` stops hardcoding the lab/library binary.

## UI

Two collapsible levels and one visual level:

```
CREATORS
├─ Daniel SoundsGood                    50
│  danielsoundsgood.itch.io
│  └─ Free Laser Weapon Sound Library   50
│     ↗ itch.io · credit: @danielsoundsgood
│     ── beams ──
│     ├─ Continuous Beam 01
│     ── heavy blasts ──
│     ├─ Heavy Blast 01
│     └─ …
```

Creator group and pack group are collapsible and reuse `.rack-group` /
`.rack-family` / `.preset-card` unchanged. The group divider is a
non-interactive label row — new CSS, but small.

A pinned info row sits at the top of each pack's card list, in the slot curated
sets use for their Download button: itch link plus a click-to-copy credit line.

The panel's attribution block is deliberately heavier than the Library's single
line: creator, link, verbatim terms, copyable credit.

## Testing

New `tests/creators.test.ts`. `tests/curated.test.ts` is untouched and its
licence floor stays exactly as strict.

Structural assertions always run:

- ids unique across creators, packs, and sounds
- every pack resolves to a defined creator; every sound to a defined pack
- every `file` is well-formed and under `creators/<creatorId>/<packId>/`
- every creator has an `https://` url and a non-empty credit line
- every pack has non-empty `licenseSummary` and `licenseTerms`
- every `mirrorsPresetId` resolves to a real preset

File assertions are conditional on the pack directory existing (`it.skipIf`):

- bijection between manifest entries and files on disk
- `durMs` matches the RIFF header within tolerance

This lets the suite pass both on a machine with the audio present and on a
fresh clone or CI without it.

## Out of scope

- Zip download for creator packs. The licence does not grant redistribution.
- Loosening the Library's CC0 / CC BY floor.
- Any second creator. The structure supports one; the content ships one.
