# Creator packs

The audio under this directory is **gitignored**. It is not in the repo, and it
is not in the published build.

That is deliberate. The sets in `public/curated/` clear a hard licence floor —
CC0 or CC BY, enforced by `tests/curated.test.ts` — which grants
redistribution, so those files ship. Creator packs do not clear that floor.
Daniel SoundsGood's laser weapon library, for example, is licensed:

> non-exclusive license – you're free to use this library in your commercial games.

That is a grant to **use**, not to **redistribute**. Re-hosting the WAVs on the
public site would exceed it. So the Creators tab hosts nothing publicly: it
credits the creator, quotes their terms, and sends people to the source.

Locally, with the files present, the tab is fully playable — waveforms,
audition, A/B against the synth `wpn.*` family.

## Rehydrating

The app degrades gracefully without these files, so this is optional. To get
the audio back on a machine:

1. Download the pack from the creator's page (see `url` in
   `src/creators/manifest.ts` — for the laser library,
   <https://danielsoundsgood.itch.io/laser-weapon-sound-library>).
2. Extract the archive to a scratch directory.
3. Run the importer:

```sh
./scripts/import-creator-pack.sh <extracted-dir> daniel-soundsgood laser-weapons
```

It converts to the project's WAV convention (44.1 kHz / stereo / 16-bit,
matching `public/curated/`), renames to kebab-case while preserving each
file's original ordinal, and prints a manifest stub.

It does **not** peak-normalise. The curated sets are levelled so they can be
compared; a creator pack is a showcase of someone's own mix.

## Adding a creator

Add the `Creator`, `CreatorPack`, and `CreatorSound` entries to
`src/creators/manifest.ts`, then run the importer with the new ids.
`tests/creators.test.ts` checks the structure always, and checks the files
against the manifest only when they happen to be on disk.
